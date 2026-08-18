"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { classTypes, sessions, bookings, enquiries } from "@/db/schema";
import { stripe } from "@/lib/stripe";

async function requireAdmin() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Not authenticated");
  }
}

function roundToNearestQuarterHour(date: Date): Date {
  const rounded = new Date(date);
  rounded.setMinutes(Math.round(rounded.getMinutes() / 15) * 15, 0, 0);
  return rounded;
}

export async function createSessionAction(formData: FormData) {
  await requireAdmin();

  const classTypeId = Number(formData.get("classTypeId"));
  const date = String(formData.get("date"));
  const time = String(formData.get("time"));
  const location = String(formData.get("location"));
  const maxSeats = Number(formData.get("maxSeats"));
  const notes = String(formData.get("notes") || "") || null;
  const durationMinutes = Number(formData.get("durationMinutes"));

  const startsAt = roundToNearestQuarterHour(new Date(`${date}T${time}:00`));
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60000);

  await db.insert(sessions).values({
    classTypeId,
    startsAt,
    endsAt,
    location,
    maxSeats,
    notes,
    status: "scheduled",
  });

  revalidatePath("/admin/sessions");
  revalidatePath("/booking");
}

export async function duplicateSessionAction(formData: FormData) {
  await requireAdmin();
  const sessionId = Number(formData.get("sessionId"));
  const weeksAhead = Number(formData.get("weeksAhead") || 1);

  const original = await db.query.sessions.findFirst({ where: eq(sessions.id, sessionId) });
  if (!original) return;

  const offsetMs = weeksAhead * 7 * 24 * 60 * 60 * 1000;

  await db.insert(sessions).values({
    classTypeId: original.classTypeId,
    startsAt: new Date(original.startsAt.getTime() + offsetMs),
    endsAt: new Date(original.endsAt.getTime() + offsetMs),
    location: original.location,
    maxSeats: original.maxSeats,
    notes: original.notes,
    status: "scheduled",
  });

  revalidatePath("/admin/sessions");
  revalidatePath("/booking");
}

export async function cancelSessionAction(formData: FormData) {
  await requireAdmin();
  const sessionId = Number(formData.get("sessionId"));

  const session = await db.query.sessions.findFirst({ where: eq(sessions.id, sessionId) });
  const classType = session
    ? await db.query.classTypes.findFirst({ where: eq(classTypes.id, session.classTypeId) })
    : null;
  const autoRefund = classType?.refundable ?? true;

  const affectedBookings = await db.query.bookings.findMany({
    where: eq(bookings.sessionId, sessionId),
  });

  for (const booking of affectedBookings) {
    if (booking.status === "confirmed" && booking.stripePaymentIntentId) {
      if (!autoRefund) {
        // Non-refundable class type: leave the booking "confirmed" so it still
        // shows as a paid customer in the roster for Josh to handle manually.
        continue;
      }
      try {
        await stripe.refunds.create({ payment_intent: booking.stripePaymentIntentId });
      } catch (err) {
        console.error(`Refund failed for booking ${booking.id}:`, err);
        continue;
      }
      await db.update(bookings).set({ status: "cancelled" }).where(eq(bookings.id, booking.id));
    } else if (booking.status === "pending") {
      if (booking.stripeCheckoutSessionId) {
        try {
          await stripe.checkout.sessions.expire(booking.stripeCheckoutSessionId);
        } catch {
          // Already expired/completed on Stripe's side — safe to ignore.
        }
      }
      await db.update(bookings).set({ status: "cancelled" }).where(eq(bookings.id, booking.id));
    }
  }

  await db.update(sessions).set({ status: "cancelled" }).where(eq(sessions.id, sessionId));

  revalidatePath("/admin/sessions");
  revalidatePath("/admin/bookings");
  revalidatePath("/booking");
}

function parseOptionalDate(value: FormDataEntryValue | null): Date | null {
  const str = String(value || "").trim();
  return str ? new Date(str) : null;
}

export async function createClassTypeAction(formData: FormData) {
  await requireAdmin();

  const name = String(formData.get("name"));
  const slug = String(formData.get("slug"));
  const description = String(formData.get("description"));
  const level = String(formData.get("level"));
  const durationMinutes = Number(formData.get("durationMinutes"));
  const priceCents = Math.round(Number(formData.get("price")) * 100);
  const maxSeatsDefault = Number(formData.get("maxSeatsDefault"));
  const refundable = formData.get("refundable") === "on";
  const availableFrom = parseOptionalDate(formData.get("availableFrom"));
  const availableUntil = parseOptionalDate(formData.get("availableUntil"));

  await db.insert(classTypes).values({
    name,
    slug,
    description,
    level,
    durationMinutes,
    priceCents,
    maxSeatsDefault,
    isActive: true,
    refundable,
    availableFrom,
    availableUntil,
  });

  revalidatePath("/admin/class-types");
  revalidatePath("/services");
}

export async function updateClassTypeAction(formData: FormData) {
  await requireAdmin();

  const id = Number(formData.get("id"));
  const name = String(formData.get("name"));
  const description = String(formData.get("description"));
  const level = String(formData.get("level"));
  const durationMinutes = Number(formData.get("durationMinutes"));
  const priceCents = Math.round(Number(formData.get("price")) * 100);
  const maxSeatsDefault = Number(formData.get("maxSeatsDefault"));
  const isActive = formData.get("isActive") === "on";
  const refundable = formData.get("refundable") === "on";
  const availableFrom = parseOptionalDate(formData.get("availableFrom"));
  const availableUntil = parseOptionalDate(formData.get("availableUntil"));

  await db
    .update(classTypes)
    .set({
      name,
      description,
      level,
      durationMinutes,
      priceCents,
      maxSeatsDefault,
      isActive,
      refundable,
      availableFrom,
      availableUntil,
    })
    .where(eq(classTypes.id, id));

  revalidatePath("/admin/class-types");
  revalidatePath("/services");
  revalidatePath("/booking");
}

export async function deleteSessionAction(formData: FormData) {
  await requireAdmin();
  const sessionId = Number(formData.get("sessionId"));

  const existingBooking = await db.query.bookings.findFirst({ where: eq(bookings.sessionId, sessionId) });
  if (existingBooking) {
    // Has booking history (even cancelled/expired) — cancel instead of delete
    // so records aren't lost and the foreign key stays intact.
    return;
  }

  await db.delete(sessions).where(eq(sessions.id, sessionId));

  revalidatePath("/admin/sessions");
  revalidatePath("/booking");
}

export async function deleteClassTypeAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));

  const existingSession = await db.query.sessions.findFirst({ where: eq(sessions.classTypeId, id) });
  if (existingSession) {
    // Sessions (and possibly bookings) depend on this class type — deactivate
    // instead via the Active checkbox rather than deleting.
    return;
  }

  await db.delete(classTypes).where(eq(classTypes.id, id));

  revalidatePath("/admin/class-types");
  revalidatePath("/services");
  revalidatePath("/booking");
}

export async function deleteEnquiryAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));

  await db.delete(enquiries).where(eq(enquiries.id, id));

  revalidatePath("/admin/enquiries");
  revalidatePath("/admin");
}

export async function getSessionRoster(sessionId: number) {
  await requireAdmin();
  return db.query.bookings.findMany({
    where: eq(bookings.sessionId, sessionId),
    orderBy: (b, { asc }) => asc(b.customerName),
  });
}
