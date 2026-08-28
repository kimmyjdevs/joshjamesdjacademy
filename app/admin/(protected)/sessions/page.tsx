import Link from "next/link";
import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { classTypes, sessions, bookings } from "@/db/schema";
import { getSeatsRemainingForSessions } from "@/lib/availability";
import { formatSessionDate, formatSessionTime } from "@/lib/utils";
import { createSessionAction, duplicateSessionAction, cancelSessionAction, deleteSessionAction } from "@/lib/admin-actions";
import { ConfirmButton } from "@/components/admin/confirm-button";

export default async function AdminSessionsPage() {
  const [allSessions, activeClassTypes, bookingCountRows] = await Promise.all([
    db
      .select({
        id: sessions.id,
        startsAt: sessions.startsAt,
        endsAt: sessions.endsAt,
        location: sessions.location,
        maxSeats: sessions.maxSeats,
        status: sessions.status,
        className: classTypes.name,
      })
      .from(sessions)
      .innerJoin(classTypes, eq(sessions.classTypeId, classTypes.id))
      .orderBy(desc(sessions.startsAt)),
    db.query.classTypes.findMany({ where: eq(classTypes.isActive, true), orderBy: asc(classTypes.sortOrder) }),
    db.select({ sessionId: bookings.sessionId, count: sql<string>`count(*)` }).from(bookings).groupBy(bookings.sessionId),
  ]);

  const heldMap = await getSeatsRemainingForSessions(allSessions.map((s) => s.id));
  const bookingCounts = new Map(bookingCountRows.map((r) => [r.sessionId, Number(r.count)]));

  return (
    <div>
      <h1 className="text-3xl">Sessions</h1>

      <section className="mt-8 border border-ink/10 bg-paper p-6">
        <h2 className="font-display text-lg uppercase">Add a Session</h2>
        <form action={createSessionAction} className="mt-4 grid gap-4 md:grid-cols-3">
          <SelectField name="classTypeId" label="Class">
            {activeClassTypes.map((ct) => (
              <option key={ct.id} value={ct.id}>
                {ct.name}
              </option>
            ))}
          </SelectField>
          <TextField name="date" label="Date" type="date" required />
          <TextField name="time" label="Time" type="time" step={900} required />
          <TextField name="durationMinutes" label="Duration (min)" type="number" defaultValue="120" required />
          <TextField name="maxSeats" label="Max seats" type="number" defaultValue="8" required />
          <TextField name="location" label="Location" defaultValue="Josh James DJ Academy Studio, Fortitude Valley, Brisbane QLD" required />
          <SelectField name="repeat" label="Repeat">
            <option value="none">Just this one</option>
            <option value="weekly">Weekly</option>
            <option value="fortnightly">Fortnightly</option>
          </SelectField>
          <TextField name="occurrences" label="How many sessions" type="number" defaultValue="1" />
          <div className="md:col-span-3">
            <label className="mb-2 block font-display text-xs uppercase tracking-wide">
              Notes (shown to booked students)
            </label>
            <textarea name="notes" rows={2} className="w-full border border-ink/20 bg-paper px-4 py-3 text-sm focus:border-ink" />
          </div>
          <p className="md:col-span-3 -mt-2 text-xs text-graphite">
            "How many sessions" only matters if Repeat is set to Weekly or Fortnightly — e.g. Weekly + 8
            creates 8 sessions, one every week starting from the date above. Leave Repeat on "Just this
            one" to add a single session like before.
          </p>
          <div className="md:col-span-3">
            <button className="bg-ink px-6 py-3 font-display text-sm uppercase tracking-wide text-paper hover:bg-blood">
              Create Session(s)
            </button>
          </div>
        </form>
      </section>

      <section className="mt-10 overflow-x-auto border border-ink/10 bg-paper">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-ink/10 bg-cloud text-left">
            <tr>
              <th className="px-4 py-3 font-display text-xs uppercase">Class</th>
              <th className="px-4 py-3 font-display text-xs uppercase">Date</th>
              <th className="px-4 py-3 font-display text-xs uppercase">Seats</th>
              <th className="px-4 py-3 font-display text-xs uppercase">Status</th>
              <th className="px-4 py-3 font-display text-xs uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {allSessions.map((s) => {
              const remaining = Math.max(s.maxSeats - (heldMap.get(s.id) ?? 0), 0);
              const bookingCount = bookingCounts.get(s.id) ?? 0;
              return (
                <tr key={s.id} className="border-b border-ink/5 last:border-0">
                  <td className="px-4 py-3 font-medium">{s.className}</td>
                  <td className="px-4 py-3">
                    {formatSessionDate(s.startsAt)}, {formatSessionTime(s.startsAt)}
                  </td>
                  <td className="px-4 py-3">
                    {remaining} / {s.maxSeats}
                  </td>
                  <td className="px-4 py-3 capitalize">{s.status}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <Link href={`/admin/sessions/${s.id}/roster`} className="text-blood hover:underline">
                        Roster
                      </Link>
                      <form action={duplicateSessionAction}>
                        <input type="hidden" name="sessionId" value={s.id} />
                        <input type="hidden" name="weeksAhead" value="1" />
                        <button type="submit" className="hover:underline">
                          Duplicate +1wk
                        </button>
                      </form>
                      {s.status === "scheduled" && (
                        <form action={cancelSessionAction}>
                          <input type="hidden" name="sessionId" value={s.id} />
                          <button type="submit" className="text-graphite hover:underline">
                            Cancel
                          </button>
                        </form>
                      )}
                      {bookingCount === 0 && (
                        <form action={deleteSessionAction}>
                          <input type="hidden" name="sessionId" value={s.id} />
                          <ConfirmButton
                            confirmMessage={`Delete this ${s.className} session? This can't be undone.`}
                            className="text-graphite hover:text-blood hover:underline"
                          >
                            Delete
                          </ConfirmButton>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function TextField({
  name,
  label,
  type = "text",
  defaultValue,
  required,
  step,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
  step?: number;
}) {
  return (
    <div>
      <label className="mb-2 block font-display text-xs uppercase tracking-wide">{label}</label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        step={step}
        className="w-full border border-ink/20 bg-paper px-4 py-3 text-sm focus:border-ink"
      />
    </div>
  );
}

function SelectField({
  name,
  label,
  children,
}: {
  name: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block font-display text-xs uppercase tracking-wide">{label}</label>
      <select name={name} required className="w-full border border-ink/20 bg-paper px-4 py-3 text-sm focus:border-ink">
        {children}
      </select>
    </div>
  );
}
