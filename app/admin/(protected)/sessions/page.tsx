import Link from "next/link";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { classTypes, sessions } from "@/db/schema";
import { getSeatsRemainingForSessions } from "@/lib/availability";
import { formatSessionDate, formatSessionTime } from "@/lib/utils";
import { createSessionAction, duplicateSessionAction, cancelSessionAction } from "@/lib/admin-actions";

export default async function AdminSessionsPage() {
  const [allSessions, activeClassTypes] = await Promise.all([
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
  ]);

  const heldMap = await getSeatsRemainingForSessions(allSessions.map((s) => s.id));

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
          <TextField name="time" label="Time" type="time" required />
          <TextField name="durationMinutes" label="Duration (min)" type="number" defaultValue="120" required />
          <TextField name="maxSeats" label="Max seats" type="number" defaultValue="8" required />
          <TextField name="location" label="Location" defaultValue="Josh James DJ Academy Studio, Fortitude Valley, Brisbane QLD" required />
          <div className="md:col-span-3">
            <label className="mb-2 block font-display text-xs uppercase tracking-wide">
              Notes (shown to booked students)
            </label>
            <textarea name="notes" rows={2} className="w-full border border-ink/20 bg-paper px-4 py-3 text-sm focus:border-ink" />
          </div>
          <div className="md:col-span-3">
            <button className="bg-ink px-6 py-3 font-display text-sm uppercase tracking-wide text-paper hover:bg-blood">
              Create Session
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
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block font-display text-xs uppercase tracking-wide">{label}</label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
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
