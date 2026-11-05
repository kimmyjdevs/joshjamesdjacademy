"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { classTypes, sessions, bookings, enquiries, weeklySchedules } from "@/db/schema";
import { stripe } from "@/lib/stripe";
import { isAllowedAdminEmail } from "@/lib/admin-auth";
import {
  brisbaneDateTime,
  brisbaneToday,
  addDays,
  clearOpenScheduledSlots,
  ensureScheduledSessions,
} from "@/lib/schedules";
import {
  syncSessionToCalendar,
  deleteCalendarEvent,
  disconnectGoogleCalendar,
  setSelectedCalendar,
  sendTestCalendarEvent,
} from "@/lib/google-calendar";

async function requireAdmin() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Not authenticated");
  }
  // Signed in isn't enough — server actions can be called directly, so
  // enforce the same allowlist the admin layout does.
  if (!(await isAllowedAdminEmail())) {
    throw new Error("Not authorized");
  }
}

function roundToNearestQuarterHour(date: Date): Date {
  const rounded = new Date(date);
  rounded.setMinutes(Math.round(rounded.getMinutes() / 15) * 15, 0, 0);
  return rounded;
}

const REPEAT_INTERVAL_DAYS: Record<string, number> = {
  weekly: 7,
  fortnightly: 14,
};

export async function createSessionAction(formData: FormData) {
  await requireAdmin();

  const classTypeId = Number(formData.get("classTypeId"));
  const date = String(formData.get("date"));
  const time = String(formData.get("time"));
  const location = String(formData.get("location"));
  const maxSeats = Number(formData.get("maxSeats"));
  const notes = String(formData.get("notes") || "") || null;
  const durationMinutes = Number(formData.get("durationMinutes"));
  const repeat = String(formData.get("repeat") || "none");
  const occurrences = Math.min(Math.max(Number(formData.get("occurrences")) || 1, 1), 52);

  // Times are typed in Brisbane local time — the server itself runs on UTC,
  // so parse with an explicit offset or 9am would be saved as 7pm.
  const firstStartsAt = roundToNearestQuarterHour(brisbaneDateTime(date, time));
  const intervalDays = REPEAT_INTERVAL_DAYS[repeat] ?? 0;
  const count = intervalDays > 0 ? occurrences : 1;

  const rows = Array.from({ length: count }, (_, i) => {
    const startsAt = new Date(firstStartsAt.getTime() + i * intervalDays * 24 * 60 * 60 * 1000);
    const endsAt = new Date(startsAt.getTime() + durationMinutes * 60000);
    return {
      classTypeId,
      startsAt,
      endsAt,
      location,
      maxSeats,
      notes,
      status: "scheduled" as const,
    };
  });

  await db.insert(sessions).values(rows);

  revalidatePath("/admin/sessions");
  revalidatePath("/booking");
}

export async function updateSessionLocationAction(formData: FormData) {
  await requireAdmin();
  const sessionId = Number(formData.get("sessionId"));
  const location = String(formData.get("location") || "").trim();
  if (!location) return;

  await db.update(sessions).set({ location }).where(eq(sessions.id, sessionId));
  // Keep an already-synced calendar event's location current too.
  await syncSessionToCalendar(sessionId);

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
  await deleteCalendarEvent(sessionId);

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

  const name = String(formData.get("name")).trim();
  // Generated from the name (used in the booking page filter); add a short
  // suffix if another class already uses it.
  const baseSlug =
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100) || "class";
  const taken = await db.query.classTypes.findFirst({ where: eq(classTypes.slug, baseSlug) });
  const slug = taken ? `${baseSlug}-${Date.now().toString(36).slice(-4)}` : baseSlug;
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

export async function deleteBookingAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));

  const booking = await db.query.bookings.findFirst({ where: eq(bookings.id, id) });
  if (!booking) return;

  if (booking.status === "confirmed" && booking.stripePaymentIntentId) {
    try {
      await stripe.refunds.create({ payment_intent: booking.stripePaymentIntentId });
    } catch (err) {
      // Don't delete a paid booking if the refund failed — would lose the
      // only record that this customer paid and was never refunded.
      console.error(`Refund failed for booking ${id}, not deleting:`, err);
      return;
    }
  } else if (booking.status === "pending" && booking.stripeCheckoutSessionId) {
    try {
      await stripe.checkout.sessions.expire(booking.stripeCheckoutSessionId);
    } catch {
      // Already expired/completed on Stripe's side — safe to ignore.
    }
  }

  await db.delete(bookings).where(eq(bookings.id, id));
  await syncSessionToCalendar(booking.sessionId);

  revalidatePath("/admin/bookings");
  revalidatePath("/admin/sessions");
  revalidatePath("/admin");
}

export async function disconnectGoogleCalendarAction() {
  await requireAdmin();
  await disconnectGoogleCalendar();
  revalidatePath("/admin");
}

export async function setGoogleCalendarAction(formData: FormData) {
  await requireAdmin();
  const calendarId = String(formData.get("calendarId") || "").trim();
  if (!calendarId) return;
  await setSelectedCalendar(calendarId);
  revalidatePath("/admin");
}

export async function sendTestCalendarEventAction() {
  await requireAdmin();
  const result = await sendTestCalendarEvent();

  const params = new URLSearchParams();
  if (result.ok) {
    params.set("calendar", "test_sent");
    params.set("testEventUrl", result.htmlLink);
    params.set("testCalendarName", result.calendarSummary);
  } else {
    params.set("calendar", "test_failed");
    params.set("testError", result.error);
  }
  redirect(`/admin?${params.toString()}`);
}

export async function getSessionRoster(sessionId: number) {
  await requireAdmin();
  return db.query.bookings.findMany({
    where: eq(bookings.sessionId, sessionId),
    orderBy: (b, { asc }) => asc(b.customerName),
  });
}

// ---------------------------------------------------------------------------
// Weekly schedules ("Mon–Sat, every hour 10am–5pm, forever")
// ---------------------------------------------------------------------------

function isTime(v: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
}

export async function createWeeklyScheduleAction(formData: FormData) {
  await requireAdmin();

  const classTypeId = Number(formData.get("classTypeId"));
  const days = formData.getAll("days").map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  const firstStartTime = String(formData.get("firstStartTime") || "");
  const lastStartTime = String(formData.get("lastStartTime") || "") || firstStartTime;
  const intervalMinutes = Number(formData.get("intervalMinutes"));
  const durationMinutes = Number(formData.get("durationMinutes"));
  const maxSeats = Number(formData.get("maxSeats"));
  const location = String(formData.get("location") || "").trim();
  const notes = String(formData.get("notes") || "").trim() || null;
  const startDate = String(formData.get("startDate") || "") || brisbaneToday();
  const endDate = String(formData.get("endDate") || "") || null;

  const problems: string[] = [];
  if (!classTypeId) problems.push("pick a class");
  if (days.length === 0) problems.push("tick at least one day");
  if (!isTime(firstStartTime) || !isTime(lastStartTime)) problems.push("enter the first and last start times");
  else if (lastStartTime < firstStartTime) problems.push("the last start time is before the first");
  if (!(intervalMinutes >= 15)) problems.push("time between sessions must be at least 15 minutes");
  if (!(durationMinutes > 0)) problems.push("enter how long each session runs");
  if (!(maxSeats >= 1)) problems.push("seats must be at least 1");
  if (!location) problems.push("enter a location");
  if (endDate && endDate < startDate) problems.push("the end date is before the start date");

  if (problems.length) {
    redirect(`/admin/sessions?scheduleError=${encodeURIComponent(problems.join(", "))}#schedules`);
  }

  await db.insert(weeklySchedules).values({
    classTypeId,
    daysOfWeek: [...new Set(days)].sort().join(","),
    firstStartTime,
    lastStartTime,
    intervalMinutes,
    durationMinutes,
    maxSeats,
    location,
    notes,
    startDate,
    endDate,
  });

  await ensureScheduledSessions();

  revalidatePath("/admin/sessions");
  revalidatePath("/booking");
  redirect("/admin/sessions?scheduleCreated=1#schedules");
}

export async function deleteWeeklyScheduleAction(formData: FormData) {
  await requireAdmin();
  const scheduleId = Number(formData.get("scheduleId"));

  const { kept } = await clearOpenScheduledSlots({ scheduleId, from: new Date() });
  // Remaining sessions (past, or with real bookings) keep existing on their
  // own — the FK is ON DELETE SET NULL.
  await db.delete(weeklySchedules).where(eq(weeklySchedules.id, scheduleId));

  revalidatePath("/admin/sessions");
  revalidatePath("/booking");
  redirect(`/admin/sessions?scheduleRemoved=1&kept=${kept}#schedules`);
}

/** Day off: removes every open schedule slot across the given date range. */
export async function blockOutDaysAction(formData: FormData) {
  await requireAdmin();
  const fromDate = String(formData.get("fromDate") || "");
  const toDate = String(formData.get("toDate") || "") || fromDate;
  if (!fromDate || toDate < fromDate) {
    redirect("/admin/sessions?blockError=1#schedules");
  }

  const { removed, kept } = await clearOpenScheduledSlots({
    from: brisbaneDateTime(fromDate, "00:00"),
    to: brisbaneDateTime(addDays(toDate, 1), "00:00"),
  });

  revalidatePath("/admin/sessions");
  revalidatePath("/booking");
  redirect(`/admin/sessions?blocked=${removed}&kept=${kept}#schedules`);
}
