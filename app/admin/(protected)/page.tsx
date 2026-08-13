import Link from "next/link";
import { and, asc, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { bookings, classTypes, enquiries, sessions } from "@/db/schema";
import { getSeatsRemainingForSessions } from "@/lib/availability";
import { formatCents, formatSessionDate, formatSessionTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const now = new Date();

  const [
    recentEnquiries,
    upcomingSessionsRaw,
    recentBookings,
    newEnquiriesRow,
    upcomingSessionsCountRow,
    bookingsThisWeekRow,
  ] = await Promise.all([
    db.query.enquiries.findMany({ orderBy: desc(enquiries.createdAt), limit: 5 }),
    db
      .select({
        id: sessions.id,
        startsAt: sessions.startsAt,
        location: sessions.location,
        maxSeats: sessions.maxSeats,
        className: classTypes.name,
      })
      .from(sessions)
      .innerJoin(classTypes, eq(sessions.classTypeId, classTypes.id))
      .where(and(eq(sessions.status, "scheduled"), gte(sessions.startsAt, now)))
      .orderBy(asc(sessions.startsAt))
      .limit(5),
    db
      .select({
        id: bookings.id,
        customerName: bookings.customerName,
        status: bookings.status,
        amountPaidCents: bookings.amountPaidCents,
        className: classTypes.name,
        startsAt: sessions.startsAt,
      })
      .from(bookings)
      .innerJoin(sessions, eq(bookings.sessionId, sessions.id))
      .innerJoin(classTypes, eq(sessions.classTypeId, classTypes.id))
      .orderBy(desc(bookings.createdAt))
      .limit(5),
    db.select({ count: sql<string>`count(*)` }).from(enquiries).where(gte(enquiries.createdAt, weekAgo)),
    db
      .select({ count: sql<string>`count(*)` })
      .from(sessions)
      .where(and(eq(sessions.status, "scheduled"), gte(sessions.startsAt, now))),
    db.select({ count: sql<string>`count(*)` }).from(bookings).where(gte(bookings.createdAt, weekAgo)),
  ]);

  const heldMap = await getSeatsRemainingForSessions(upcomingSessionsRaw.map((s) => s.id));
  const upcomingSessions = upcomingSessionsRaw.map((s) => ({
    ...s,
    seatsRemaining: Math.max(s.maxSeats - (heldMap.get(s.id) ?? 0), 0),
  }));

  return (
    <div>
      <h1 className="text-3xl">Dashboard</h1>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatTile label="New enquiries (7 days)" value={Number(newEnquiriesRow[0]?.count ?? 0)} href="/admin/enquiries" />
        <StatTile label="Upcoming sessions" value={Number(upcomingSessionsCountRow[0]?.count ?? 0)} href="/admin/sessions" />
        <StatTile label="Bookings (7 days)" value={Number(bookingsThisWeekRow[0]?.count ?? 0)} href="/admin/bookings" />
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <Section title="Upcoming Classes" viewAllHref="/admin/sessions">
          {upcomingSessions.length === 0 && <EmptyRow text="No upcoming sessions scheduled." />}
          {upcomingSessions.map((s) => (
            <div key={s.id} className="flex items-center justify-between border-b border-ink/5 py-3 last:border-0">
              <div>
                <p className="font-medium">{s.className}</p>
                <p className="text-xs text-graphite">
                  {formatSessionDate(s.startsAt)}, {formatSessionTime(s.startsAt)}
                </p>
              </div>
              <p className="whitespace-nowrap text-sm">
                {s.seatsRemaining} / {s.maxSeats} left
              </p>
            </div>
          ))}
        </Section>

        <Section title="New Enquiries" viewAllHref="/admin/enquiries">
          {recentEnquiries.length === 0 && <EmptyRow text="No enquiries yet." />}
          {recentEnquiries.map((e) => (
            <div key={e.id} className="border-b border-ink/5 py-3 last:border-0">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{e.name}</p>
                <p className="whitespace-nowrap text-xs text-graphite">
                  {new Intl.DateTimeFormat("en-AU", { dateStyle: "medium" }).format(e.createdAt)}
                </p>
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-graphite">{e.message}</p>
            </div>
          ))}
        </Section>

        <Section title="Recent Bookings" viewAllHref="/admin/bookings" className="lg:col-span-2">
          {recentBookings.length === 0 && <EmptyRow text="No bookings yet." />}
          {recentBookings.map((b) => (
            <div
              key={b.id}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/5 py-3 last:border-0"
            >
              <div>
                <p className="font-medium">{b.customerName}</p>
                <p className="text-xs text-graphite">
                  {b.className} — {formatSessionDate(b.startsAt)}
                </p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="capitalize">{b.status}</span>
                <span>{b.amountPaidCents ? formatCents(b.amountPaidCents) : "—"}</span>
              </div>
            </div>
          ))}
        </Section>
      </div>
    </div>
  );
}

function StatTile({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className="block border border-ink/10 bg-paper p-6 transition-colors hover:border-ink">
      <p className="font-display text-4xl">{value}</p>
      <p className="mt-2 text-xs uppercase tracking-wide text-graphite">{label}</p>
    </Link>
  );
}

function Section({
  title,
  viewAllHref,
  className,
  children,
}: {
  title: string;
  viewAllHref: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`border border-ink/10 bg-paper p-6 ${className || ""}`}>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg uppercase">{title}</h2>
        <Link href={viewAllHref} className="text-xs uppercase tracking-wide text-blood hover:underline">
          View all
        </Link>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return <p className="py-4 text-center text-sm text-graphite">{text}</p>;
}
