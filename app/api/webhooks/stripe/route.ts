import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${(err as Error).message}` },
      { status: 400 },
    );
  }

  if (event.type === "checkout.session.completed") {
    const checkoutSession = event.data.object as Stripe.Checkout.Session;
    await handleCheckoutCompleted(checkoutSession);
  }

  if (event.type === "checkout.session.expired") {
    const checkoutSession = event.data.object as Stripe.Checkout.Session;
    await handleCheckoutExpired(checkoutSession);
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(checkoutSession: Stripe.Checkout.Session) {
  const bookingId = Number(
    checkoutSession.metadata?.bookingId || checkoutSession.client_reference_id,
  );
  if (!bookingId) return;

  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, bookingId),
  });

  // Idempotent: webhook may be replayed by Stripe or arrive twice.
  if (!booking || booking.status === "confirmed") return;

  await db
    .update(bookings)
    .set({
      status: "confirmed",
      stripePaymentIntentId:
        typeof checkoutSession.payment_intent === "string"
          ? checkoutSession.payment_intent
          : checkoutSession.payment_intent?.id,
      amountPaidCents: checkoutSession.amount_total ?? undefined,
      confirmedAt: new Date(),
    })
    .where(eq(bookings.id, bookingId));
}

async function handleCheckoutExpired(checkoutSession: Stripe.Checkout.Session) {
  const bookingId = Number(
    checkoutSession.metadata?.bookingId || checkoutSession.client_reference_id,
  );
  if (!bookingId) return;

  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, bookingId),
  });
  if (!booking || booking.status !== "pending") return;

  await db
    .update(bookings)
    .set({ status: "expired" })
    .where(eq(bookings.id, bookingId));
}
