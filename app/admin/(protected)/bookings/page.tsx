import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings, classTypes, sessions } from "@/db/schema";
import { formatCents, formatSessionDate, formatSessionTime } from "@/lib/utils";
import { deleteBookingAction } from "@/lib/admin-actions";
import { ConfirmButton } from "@/components/admin/confirm-button";

const STATUSES = ["all", "pending", "confirmed", "cancelled", "expired"] as const;

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const statusFilter = searchParams.status && STATUSES.includes(searchParams.status as any)
    ? searchParams.status
    : "all";

  const rows = await db
    .select({
      id: bookings.id,
      customerName: bookings.customerName,
      customerEmail: bookings.customerEmail,
      seats: bookings.seats,
      status: bookings.status,
      amountPaidCents: bookings.amountPaidCents,
      createdAt: bookings.createdAt,
      className: classTypes.name,
      startsAt: sessions.startsAt,
    })
    .from(bookings)
    .innerJoin(sessions, eq(bookings.sessionId, sessions.id))
    .innerJoin(classTypes, eq(sessions.classTypeId, classTypes.id))
    .orderBy(desc(bookings.createdAt));

  const filtered = statusFilter === "all" ? rows : rows.filter((r) => r.status === statusFilter);

  return (
    <div>
      <h1 className="text-3xl">Bookings</h1>

      <div className="mt-6 flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <a
            key={s}
            href={s === "all" ? "/admin/bookings" : `/admin/bookings?status=${s}`}
            className={`border px-4 py-2 font-display text-xs uppercase tracking-wide ${
              statusFilter === s ? "border-ink bg-ink text-paper" : "border-ink/20 hover:border-ink"
            }`}
          >
            {s}
          </a>
        ))}
      </div>

      <div className="mt-6 overflow-x-auto border border-ink/10 bg-paper">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-ink/10 bg-cloud text-left">
            <tr>
              <th className="px-4 py-3 font-display text-xs uppercase">Customer</th>
              <th className="px-4 py-3 font-display text-xs uppercase">Class</th>
              <th className="px-4 py-3 font-display text-xs uppercase">Session Date</th>
              <th className="px-4 py-3 font-display text-xs uppercase">Seats</th>
              <th className="px-4 py-3 font-display text-xs uppercase">Status</th>
              <th className="px-4 py-3 font-display text-xs uppercase">Paid</th>
              <th className="px-4 py-3 font-display text-xs uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => (
              <tr key={b.id} className="border-b border-ink/5 last:border-0">
                <td className="px-4 py-3">
                  <p className="font-medium">{b.customerName}</p>
                  <p className="text-xs text-graphite">{b.customerEmail}</p>
                </td>
                <td className="px-4 py-3">{b.className}</td>
                <td className="px-4 py-3">
                  {formatSessionDate(b.startsAt)}, {formatSessionTime(b.startsAt)}
                </td>
                <td className="px-4 py-3">{b.seats}</td>
                <td className="px-4 py-3 capitalize">{b.status}</td>
                <td className="px-4 py-3">{b.amountPaidCents ? formatCents(b.amountPaidCents) : "—"}</td>
                <td className="px-4 py-3">
                  <form action={deleteBookingAction}>
                    <input type="hidden" name="id" value={b.id} />
                    <ConfirmButton
                      confirmMessage={
                        b.status === "confirmed"
                          ? `Delete this booking from ${b.customerName}? This will refund ${b.amountPaidCents ? formatCents(b.amountPaidCents) : "the payment"} via Stripe first, then remove the record. This can't be undone.`
                          : `Delete this booking from ${b.customerName}? This can't be undone.`
                      }
                      className="text-graphite hover:text-blood hover:underline"
                    >
                      Delete
                    </ConfirmButton>
                  </form>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-graphite">
                  No bookings here yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
