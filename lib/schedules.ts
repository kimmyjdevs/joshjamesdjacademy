import { and, eq, gte, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { bookings, sessions, weeklySchedules } from "@/db/schema";

// Brisbane has no daylight saving, so a fixed offset is exact year-round.
const BRISBANE_OFFSET = "+10:00";
const BRISBANE_OFFSET_MS = 10 * 60 * 60 * 1000;

/** How far ahead slots are kept generated. The window rolls forward daily. */
export const SCHEDULE_HORIZON_DAYS = 56;

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** Brisbane wall-clock date + time → absolute instant. */
export function brisbaneDateTime(ymd: string, hhmm: string) {
  return new Date(`${ymd}T${hhmm}:00${BRISBANE_OFFSET}`);
}

/** Today's date in Brisbane as YYYY-MM-DD. */
export function brisbaneToday(now = new Date()) {
  return new Date(now.getTime() + BRISBANE_OFFSET_MS).toISOString().slice(0, 10);
}

export function addDays(ymd: string, days: number) {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function weekdayOf(ymd: string) {
  return new Date(`${ymd}T00:00:00Z`).getUTCDay();
}

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function fromMinutes(mins: number) {
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
}

export function parseDays(daysOfWeek: string) {
  return daysOfWeek
    .split(",")
    .map(Number)
    .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
}

/** Start times for one day, e.g. 10:00, 11:00 … 17:00. */
export function slotTimes(firstStartTime: string, lastStartTime: string, intervalMinutes: number) {
  const first = toMinutes(firstStartTime);
  const last = toMinutes(lastStartTime);
  if (intervalMinutes <= 0 || last < first) return [first].map(fromMinutes);
  const times: string[] = [];
  for (let t = first; t <= last; t += intervalMinutes) times.push(fromMinutes(t));
  return times;
}

/** "Mon–Sat" / "Mon, Wed, Fri" for display. */
export function describeDays(daysOfWeek: string) {
  const days = parseDays(daysOfWeek).sort((a, b) => a - b);
  const isRun = days.length > 2 && days.every((d, i) => i === 0 || d === days[i - 1] + 1);
  if (isRun) return `${WEEKDAY_LABELS[days[0]]}–${WEEKDAY_LABELS[days[days.length - 1]]}`;
  return days.map((d) => WEEKDAY_LABELS[d]).join(", ");
}

/**
 * Tops up every schedule's generated sessions to SCHEDULE_HORIZON_DAYS ahead.
 * Cheap to call on every page load: each schedule records how far it has
 * already been generated, so there's normally nothing to do. Never throws —
 * a generation hiccup must not take the booking page down.
 */
export async function ensureScheduledSessions() {
  try {
    const today = brisbaneToday();
    const horizon = addDays(today, SCHEDULE_HORIZON_DAYS);
    const now = new Date();

    const schedules = await db.query.weeklySchedules.findMany();

    for (const s of schedules) {
      if (s.generatedUntil && s.generatedUntil >= horizon) continue;

      const days = new Set(parseDays(s.daysOfWeek));
      const times = slotTimes(s.firstStartTime, s.lastStartTime, s.intervalMinutes);

      let from = s.generatedUntil ? addDays(s.generatedUntil, 1) : s.startDate;
      if (from < s.startDate) from = s.startDate;
      if (from < today) from = today;
      let until = horizon;
      if (s.endDate && s.endDate < until) until = s.endDate;

      const rows: (typeof sessions.$inferInsert)[] = [];
      for (let day = from; day <= until; day = addDays(day, 1)) {
        if (!days.has(weekdayOf(day))) continue;
        for (const time of times) {
          const startsAt = brisbaneDateTime(day, time);
          if (startsAt <= now) continue;
          rows.push({
            classTypeId: s.classTypeId,
            scheduleId: s.id,
            startsAt,
            endsAt: new Date(startsAt.getTime() + s.durationMinutes * 60000),
            location: s.location,
            maxSeats: s.maxSeats,
            notes: s.notes,
            status: "scheduled",
          });
        }
      }

      for (let i = 0; i < rows.length; i += 200) {
        await db.insert(sessions).values(rows.slice(i, i + 200)).onConflictDoNothing();
      }

      await db
        .update(weeklySchedules)
        .set({ generatedUntil: horizon })
        .where(eq(weeklySchedules.id, s.id));
    }
  } catch (err) {
    console.error("Failed to generate scheduled sessions:", err);
  }
}

/**
 * Removes future generated slots nobody has booked. Slots with any booking
 * history can't be deleted (bookings reference them), so those are
 * cancelled instead — unless someone holds a confirmed/pending seat, in
 * which case they're left alone and counted in `kept`.
 */
export async function clearOpenScheduledSlots(opts: { scheduleId?: number; from: Date; to?: Date }) {
  const conditions = [isNotNull(sessions.scheduleId), gte(sessions.startsAt, opts.from), eq(sessions.status, "scheduled")];
  if (opts.scheduleId) conditions.push(eq(sessions.scheduleId, opts.scheduleId));
  if (opts.to) conditions.push(sql`${sessions.startsAt} < ${opts.to}`);

  const candidates = await db.select({ id: sessions.id }).from(sessions).where(and(...conditions));
  if (candidates.length === 0) return { removed: 0, kept: 0 };

  const ids = candidates.map((c) => c.id);
  const bookingRows = await db
    .select({ sessionId: bookings.sessionId, status: bookings.status, expiresAt: bookings.expiresAt })
    .from(bookings)
    .where(inArray(bookings.sessionId, ids));

  const now = new Date();
  const hasAnyBooking = new Set<number>();
  const hasLiveBooking = new Set<number>();
  for (const b of bookingRows) {
    hasAnyBooking.add(b.sessionId);
    if (b.status === "confirmed" || (b.status === "pending" && b.expiresAt && b.expiresAt > now)) {
      hasLiveBooking.add(b.sessionId);
    }
  }

  const toDelete = ids.filter((id) => !hasAnyBooking.has(id));
  const toCancel = ids.filter((id) => hasAnyBooking.has(id) && !hasLiveBooking.has(id));

  for (let i = 0; i < toDelete.length; i += 500) {
    await db.delete(sessions).where(inArray(sessions.id, toDelete.slice(i, i + 500)));
  }
  if (toCancel.length) {
    await db.update(sessions).set({ status: "cancelled" }).where(inArray(sessions.id, toCancel));
  }

  return { removed: toDelete.length + toCancel.length, kept: hasLiveBooking.size };
}
