import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings, classTypes, sessions } from "@/db/schema";
import { formatCents, formatSessionDate, formatSessionTime } from "@/lib/utils";
import { notFound } from "next/navigation";

export default async function SessionRosterPage({ params }: { params: { id: string } }) {
  const sessionId = Number(params.id);

  const session = await db.query.sessions.findFirst({ where: eq(sessions.id, sessionId) });
  if (!session) notFound();

  const classType = await db.query.classTypes.findFirst({ where: eq(classTypes.id, session.classTypeId) });

  const roster = await db.query.bookings.findMany({
    where: eq(bookings.sessionId, sessionId),
    orderBy: (b, { asc }) => asc(b.customerName),
  });

  const confirmed = roster.filter((b) => b.status === "confirmed");
  const pending = roster.filter((b) => b.status === "pending");

  return (
    <div>
      <p className="font-display text-sm uppercase tracking-widest text-blood">{classType?.name}</p>
      <h1 className="text-3xl">
        {formatSessionDate(session.startsAt)} &middot; {formatSessionTime(session.startsAt)}
      </h1>
      <p className="mt-1 text-graphite">{session.location}</p>

      {session.status === "cancelled" && confirmed.length > 0 && (
        <div className="mt-6 border border-blood bg-blood/5 p-4">
          <p className="font-display text-sm uppercase text-blood">
            Session cancelled — refund these customers manually in Stripe
          </p>
          <p className="mt-2 text-sm">{confirmed.map((b) => b.customerEmail).join(", ")}</p>
        </div>
      )}

      <div className="mt-8 flex items-center justify-between">
        <h2 className="font-display text-lg uppercase">
          Roster ({confirmed.reduce((sum, b) => sum + b.seats, 0)} confirmed seats)
        </h2>
        <a
          href={`/api/admin/bookings/export?sessionId=${sessionId}`}
          className="border border-ink px-4 py-2 font-display text-xs uppercase tracking-wide hover:bg-ink hover:text-paper"
        >
          Export CSV
        </a>
      </div>

      <div className="mt-4 overflow-x-auto border border-ink/10 bg-paper">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="border-b border-ink/10 bg-cloud text-left">
            <tr>
              <th className="px-4 py-3 font-display text-xs uppercase">Name</th>
              <th className="px-4 py-3 font-display text-xs uppercase">Email</th>
              <th className="px-4 py-3 font-display text-xs uppercase">Phone</th>
              <th className="px-4 py-3 font-display text-xs uppercase">Seats</th>
              <th className="px-4 py-3 font-display text-xs uppercase">Paid</th>
            </tr>
          </thead>
          <tbody>
            {confirmed.map((b) => (
              <tr key={b.id} className="border-b border-ink/5 last:border-0">
                <td className="px-4 py-3 font-medium">{b.customerName}</td>
                <td className="px-4 py-3">{b.customerEmail}</td>
                <td className="px-4 py-3">{b.customerPhone || "—"}</td>
                <td className="px-4 py-3">{b.seats}</td>
                <td className="px-4 py-3">{b.amountPaidCents ? formatCents(b.amountPaidCents) : "—"}</td>
              </tr>
            ))}
            {confirmed.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-graphite">
                  No confirmed bookings yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pending.length > 0 && (
        <p className="mt-4 text-xs text-graphite">
          {pending.length} checkout{pending.length === 1 ? "" : "s"} currently in progress (unconfirmed holds).
        </p>
      )}
    </div>
  );
}
