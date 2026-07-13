import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings, classTypes, sessions } from "@/db/schema";
import { googleCalendarUrl } from "@/lib/ics";

export async function GET(req: NextRequest) {
  const checkoutSessionId = req.nextUrl.searchParams.get("session_id");

  if (!checkoutSessionId) {
    return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
  }

  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.stripeCheckoutSessionId, checkoutSessionId),
  });

  if (!booking) {
    return NextResponse.json({ status: "not_found" }, { status: 404 });
  }

  if (booking.status !== "confirmed") {
    return NextResponse.json({ status: booking.status });
  }

  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, booking.sessionId),
  });
  const classType = session
    ? await db.query.classTypes.findFirst({ where: eq(classTypes.id, session.classTypeId) })
    : null;

  if (!session || !classType) {
    return NextResponse.json({ status: "confirmed" });
  }

  return NextResponse.json({
    status: "confirmed",
    booking: {
      customerName: booking.customerName,
      seats: booking.seats,
      amountPaidCents: booking.amountPaidCents,
    },
    session: {
      className: classType.name,
      startsAt: session.startsAt,
      endsAt: session.endsAt,
      location: session.location,
      notes: session.notes,
    },
    calendar: {
      googleUrl: googleCalendarUrl({
        title: `${classType.name} — Josh James DJ Academy`,
        details: session.notes || "See you in the room.",
        location: session.location,
        startsAt: session.startsAt,
        endsAt: session.endsAt,
      }),
      icsUrl: `/api/booking/ics?session_id=${encodeURIComponent(checkoutSessionId)}`,
    },
  });
}
