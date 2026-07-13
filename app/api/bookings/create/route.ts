import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, sql } from "@/db";
import { bookings, classTypes, sessions } from "@/db/schema";
import { stripe } from "@/lib/stripe";
import { siteConfig } from "@/lib/site";
import { STRIPE_SESSION_EXPIRY_MINUTES } from "@/lib/availability";

const bodySchema = z.object({
  sessionId: z.number().int().positive(),
  seats: z.number().int().min(1).max(2),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  phone: z.string().trim().max(40).optional(),
});

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "That didn't come through right. Check the form and try again." },
      { status: 400 },
    );
  }

  const { sessionId, seats, name, email, phone } = parsed.data;

  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
  });

  if (!session || session.status !== "scheduled") {
    return NextResponse.json(
      { error: "That session isn't available anymore." },
      { status: 404 },
    );
  }

  const classType = await db.query.classTypes.findFirst({
    where: eq(classTypes.id, session.classTypeId),
  });

  if (!classType) {
    return NextResponse.json({ error: "Class not found." }, { status: 404 });
  }

  // Atomic hold: advisory-locks the session row for the duration of this
  // Postgres transaction so two people racing for the last seat can't both
  // succeed, then re-checks availability against a fresh snapshot before
  // inserting the pending booking.
  const results = await sql.transaction(
    (tx) => [
      tx`select pg_advisory_xact_lock(${sessionId})`,
      tx`
        insert into bookings (session_id, customer_name, customer_email, customer_phone, seats, status, expires_at)
        select ${sessionId}, ${name}, ${email}, ${phone ?? null}, ${seats}, 'pending', now() + interval '15 minutes'
        where ${session.maxSeats} - coalesce((
          select sum(b.seats) from bookings b
          where b.session_id = ${sessionId}
            and (b.status = 'confirmed' or (b.status = 'pending' and b.expires_at > now()))
        ), 0) >= ${seats}
        returning id
      `,
    ],
    { isolationLevel: "ReadCommitted" },
  );

  const insertRows = results[1] as unknown as { id: number }[];
  const bookingId = insertRows[0]?.id;

  if (!bookingId) {
    return NextResponse.json(
      {
        error:
          "That seat just went — someone beat you to it. Head back and grab the next available session.",
      },
      { status: 409 },
    );
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: email,
    client_reference_id: String(bookingId),
    line_items: [
      {
        price_data: {
          currency: classType.currency,
          unit_amount: classType.priceCents,
          product_data: {
            name: classType.name,
            description: `${session.startsAt.toDateString()} — ${session.location}`,
          },
        },
        quantity: seats,
      },
    ],
    expires_at: Math.floor(Date.now() / 1000) + STRIPE_SESSION_EXPIRY_MINUTES * 60,
    success_url: `${siteConfig.url}/booking/confirmed?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteConfig.url}/booking?cancelled=1`,
    metadata: { bookingId: String(bookingId) },
  });

  await db
    .update(bookings)
    .set({ stripeCheckoutSessionId: checkoutSession.id })
    .where(eq(bookings.id, bookingId));

  return NextResponse.json({ checkoutUrl: checkoutSession.url });
}
