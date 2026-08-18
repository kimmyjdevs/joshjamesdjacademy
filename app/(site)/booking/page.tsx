import type { Metadata } from "next";
import { and, asc, eq, gte, isNull, lte, or } from "drizzle-orm";
import { db } from "@/db";
import { classTypes, sessions } from "@/db/schema";
import { getSeatsRemainingForSessions } from "@/lib/availability";
import { BookingBrowser, type BookableSession } from "@/components/booking/booking-browser";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Book a DJ Class in Brisbane",
  description:
    "Browse upcoming DJ class sessions in Brisbane, see live seat availability, and book in minutes. Group classes, 1-on-1 coaching, and the Club-Ready Program.",
  alternates: { canonical: "/booking" },
};

export const revalidate = 0;

async function getBookableSessions(): Promise<BookableSession[]> {
  const rows = await db
    .select({
      id: sessions.id,
      classTypeId: sessions.classTypeId,
      startsAt: sessions.startsAt,
      endsAt: sessions.endsAt,
      location: sessions.location,
      maxSeats: sessions.maxSeats,
      notes: sessions.notes,
      className: classTypes.name,
      classSlug: classTypes.slug,
      level: classTypes.level,
      durationMinutes: classTypes.durationMinutes,
      priceCents: classTypes.priceCents,
      currency: classTypes.currency,
      description: classTypes.description,
    })
    .from(sessions)
    .innerJoin(classTypes, eq(sessions.classTypeId, classTypes.id))
    .where(
      and(
        eq(sessions.status, "scheduled"),
        gte(sessions.startsAt, new Date()),
        eq(classTypes.isActive, true),
        or(isNull(classTypes.availableFrom), lte(classTypes.availableFrom, new Date())),
        or(isNull(classTypes.availableUntil), gte(classTypes.availableUntil, new Date())),
      ),
    )
    .orderBy(asc(sessions.startsAt));

  const heldMap = await getSeatsRemainingForSessions(rows.map((r) => r.id));

  return rows.map((row) => ({
    ...row,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    seatsRemaining: Math.max(row.maxSeats - (heldMap.get(row.id) ?? 0), 0),
  }));
}

export default async function BookingPage() {
  const [bookableSessions, activeClassTypes] = await Promise.all([
    getBookableSessions(),
    db.query.classTypes.findMany({
      where: eq(classTypes.isActive, true),
      orderBy: asc(classTypes.sortOrder),
    }),
  ]);

  const jsonLd = bookableSessions.map((s) => ({
    "@context": "https://schema.org",
    "@type": "Event",
    name: s.className,
    startDate: s.startsAt,
    endDate: s.endsAt,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "Place",
      name: s.location,
      address: s.location,
    },
    offers: {
      "@type": "Offer",
      price: (s.priceCents / 100).toFixed(2),
      priceCurrency: s.currency.toUpperCase(),
      availability:
        s.seatsRemaining > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/SoldOut",
      url: `${siteConfig.url}/booking`,
    },
    organizer: {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url,
    },
  }));

  return (
    <div className="container-x py-16 md:py-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mb-12 max-w-2xl">
        <p className="mb-3 font-display text-sm uppercase tracking-widest text-blood">
          Book a Class
        </p>
        <h1 className="text-4xl md:text-5xl">Pick a date. Lock your seat.</h1>
        <p className="mt-4 text-graphite">
          Book straight in — no back-and-forth emails. Select a session, pay securely with
          Stripe, and your seat is confirmed on the spot.
        </p>
      </div>

      <BookingBrowser sessions={bookableSessions} classTypes={activeClassTypes} />
    </div>
  );
}
