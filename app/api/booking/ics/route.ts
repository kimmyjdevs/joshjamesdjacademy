import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings, classTypes, sessions } from "@/db/schema";
import { generateBookingIcs } from "@/lib/ics";
import { siteConfig } from "@/lib/site";

export async function GET(req: NextRequest) {
  const checkoutSessionId = req.nextUrl.searchParams.get("session_id");
  if (!checkoutSessionId) {
    return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
  }

  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.stripeCheckoutSessionId, checkoutSessionId),
  });
  if (!booking || booking.status !== "confirmed") {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, booking.sessionId),
  });
  const classType = session
    ? await db.query.classTypes.findFirst({ where: eq(classTypes.id, session.classTypeId) })
    : null;

  if (!session || !classType) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const ics = generateBookingIcs({
    title: `${classType.name} — Josh James DJ Academy`,
    description: session.notes || "See you in the room.",
    location: session.location,
    startsAt: session.startsAt,
    endsAt: session.endsAt,
    organizerEmail: siteConfig.email,
  });

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar",
      "Content-Disposition": 'attachment; filename="josh-james-dj-academy.ics"',
    },
  });
}
