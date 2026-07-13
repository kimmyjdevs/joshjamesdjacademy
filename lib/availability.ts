import { and, eq, gt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { bookings, sessions } from "@/db/schema";

/**
 * A seat is "held" by a booking that is confirmed, or pending with a hold
 * that hasn't expired yet — same model as a hotel holding a room while a
 * guest is mid-checkout.
 */
export function heldSeatsExpr() {
  return sql<number>`coalesce(sum(
    case when ${bookings.status} = 'confirmed'
      or (${bookings.status} = 'pending' and ${bookings.expiresAt} > now())
    then ${bookings.seats} else 0 end
  ), 0)`;
}

export async function getSeatsRemaining(sessionId: number, maxSeats: number) {
  const [row] = await db
    .select({ held: heldSeatsExpr() })
    .from(bookings)
    .where(eq(bookings.sessionId, sessionId));

  const held = Number(row?.held ?? 0);
  return Math.max(maxSeats - held, 0);
}

export async function getSeatsRemainingForSessions(sessionIds: number[]) {
  if (sessionIds.length === 0) return new Map<number, number>();

  const rows = await db
    .select({
      sessionId: bookings.sessionId,
      held: heldSeatsExpr(),
    })
    .from(bookings)
    .where(
      and(
        or(...sessionIds.map((id) => eq(bookings.sessionId, id))),
      ),
    )
    .groupBy(bookings.sessionId);

  const map = new Map<number, number>();
  for (const row of rows) {
    map.set(row.sessionId, Number(row.held));
  }
  return map;
}

export const HOLD_DURATION_MINUTES = 15;
export const STRIPE_SESSION_EXPIRY_MINUTES = 30;
