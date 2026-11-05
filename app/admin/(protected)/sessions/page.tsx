import Link from "next/link";
import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { classTypes, sessions, bookings, weeklySchedules } from "@/db/schema";
import { getSeatsRemainingForSessions } from "@/lib/availability";
import { formatSessionDate, formatSessionTime } from "@/lib/utils";
import {
  createSessionAction,
  duplicateSessionAction,
  cancelSessionAction,
  deleteSessionAction,
  updateSessionLocationAction,
  createWeeklyScheduleAction,
  deleteWeeklyScheduleAction,
  blockOutDaysAction,
} from "@/lib/admin-actions";
import {
  ensureScheduledSessions,
  describeDays,
  slotTimes,
  brisbaneToday,
  WEEKDAY_LABELS,
  SCHEDULE_HORIZON_DAYS,
} from "@/lib/schedules";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { ClassDefaultsSelect } from "@/components/admin/class-defaults-select";

const DEFAULT_LOCATION = "Josh James DJ Academy Studio, Fortitude Valley, Brisbane QLD";

type SearchParams = {
  scheduleCreated?: string;
  scheduleRemoved?: string;
  scheduleError?: string;
  blocked?: string;
  blockError?: string;
  kept?: string;
};

/** "17:00" → "5:00 pm" (a wall-clock time, so formatted with no timezone shift). */
function formatClock(hhmm: string) {
  return new Intl.DateTimeFormat("en-AU", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "UTC" }).format(
    new Date(`2000-01-01T${hhmm}:00Z`),
  );
}

export default async function AdminSessionsPage({ searchParams }: { searchParams: SearchParams }) {
  await ensureScheduledSessions();

  const now = new Date();
  const [allSessions, activeClassTypes, bookingCountRows, schedules] = await Promise.all([
    db
      .select({
        id: sessions.id,
        startsAt: sessions.startsAt,
        endsAt: sessions.endsAt,
        location: sessions.location,
        maxSeats: sessions.maxSeats,
        status: sessions.status,
        scheduleId: sessions.scheduleId,
        className: classTypes.name,
      })
      .from(sessions)
      .innerJoin(classTypes, eq(sessions.classTypeId, classTypes.id))
      .orderBy(asc(sessions.startsAt)),
    db.query.classTypes.findMany({ where: eq(classTypes.isActive, true), orderBy: asc(classTypes.sortOrder) }),
    db.select({ sessionId: bookings.sessionId, count: sql<string>`count(*)` }).from(bookings).groupBy(bookings.sessionId),
    db
      .select({
        id: weeklySchedules.id,
        daysOfWeek: weeklySchedules.daysOfWeek,
        firstStartTime: weeklySchedules.firstStartTime,
        lastStartTime: weeklySchedules.lastStartTime,
        intervalMinutes: weeklySchedules.intervalMinutes,
        durationMinutes: weeklySchedules.durationMinutes,
        maxSeats: weeklySchedules.maxSeats,
        location: weeklySchedules.location,
        startDate: weeklySchedules.startDate,
        endDate: weeklySchedules.endDate,
        className: classTypes.name,
      })
      .from(weeklySchedules)
      .innerJoin(classTypes, eq(weeklySchedules.classTypeId, classTypes.id))
      .orderBy(desc(weeklySchedules.createdAt)),
  ]);

  const heldMap = await getSeatsRemainingForSessions(allSessions.map((s) => s.id));
  const bookingCounts = new Map(bookingCountRows.map((r) => [r.sessionId, Number(r.count)]));

  const upcomingAll = allSessions.filter((s) => s.startsAt >= now);
  // Schedule slots nobody's booked are listed on the schedule, not here —
  // otherwise this table would be hundreds of identical rows.
  const upcoming = upcomingAll.filter(
    (s) => s.scheduleId == null || (heldMap.get(s.id) ?? 0) > 0 || s.status !== "scheduled",
  );
  const hiddenOpenSlots = upcomingAll.length - upcoming.length;
  const past = allSessions.filter((s) => s.startsAt < now).reverse();

  const openSlotsBySchedule = new Map<number, number>();
  for (const s of upcomingAll) {
    if (s.scheduleId != null && s.status === "scheduled" && (heldMap.get(s.id) ?? 0) < s.maxSeats) {
      openSlotsBySchedule.set(s.scheduleId, (openSlotsBySchedule.get(s.scheduleId) ?? 0) + 1);
    }
  }

  const classOptions = activeClassTypes.map((ct) => ({
    id: ct.id,
    name: ct.name,
    durationMinutes: ct.durationMinutes,
    maxSeatsDefault: ct.maxSeatsDefault,
  }));
  const today = brisbaneToday();
  const kept = Number(searchParams.kept || 0);

  const renderRow = (s: (typeof allSessions)[number]) => {
    const held = heldMap.get(s.id) ?? 0;
    const remaining = Math.max(s.maxSeats - held, 0);
    const bookingCount = bookingCounts.get(s.id) ?? 0;
    return (
      <tr key={s.id} className="border-b border-ink/5 last:border-0">
        <td className="px-4 py-3 font-medium">
          {s.className}
          {s.scheduleId != null && <span className="ml-2 text-xs font-normal text-graphite">(weekly)</span>}
        </td>
        <td className="px-4 py-3">
          {formatSessionDate(s.startsAt)}, {formatSessionTime(s.startsAt)}
        </td>
        <td className="px-4 py-3">
          <form action={updateSessionLocationAction} className="flex items-center gap-2">
            <input type="hidden" name="sessionId" value={s.id} />
            <input
              name="location"
              defaultValue={s.location}
              required
              className="w-56 border border-ink/20 bg-paper px-2 py-1.5 text-sm focus:border-ink"
            />
            <button type="submit" className="text-xs uppercase tracking-wide text-blood hover:underline">
              Save
            </button>
          </form>
        </td>
        <td className="px-4 py-3">
          {held} booked · {remaining} free
        </td>
        <td className="px-4 py-3 capitalize">{s.status}</td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <Link href={`/admin/sessions/${s.id}/roster`} className="text-blood hover:underline">
              Who&apos;s booked
            </Link>
            {s.scheduleId == null && (
              <form action={duplicateSessionAction}>
                <input type="hidden" name="sessionId" value={s.id} />
                <input type="hidden" name="weeksAhead" value="1" />
                <button type="submit" className="hover:underline">
                  Copy to next week
                </button>
              </form>
            )}
            {s.status === "scheduled" && (
              <form action={cancelSessionAction}>
                <input type="hidden" name="sessionId" value={s.id} />
                <ConfirmButton
                  confirmMessage="Cancel this session? Anyone booked will be refunded if the class is refundable."
                  className="text-graphite hover:underline"
                >
                  Cancel
                </ConfirmButton>
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
  };

  return (
    <div>
      <h1 className="text-3xl">Dates &amp; Times</h1>
      <p className="mt-2 max-w-3xl text-graphite">
        A class only shows on the booking page once it has dates here. Use a <strong>weekly schedule</strong> for
        anything that runs regularly (it keeps going forever), or <strong>add a one-off date</strong> for things like
        a holiday program.
      </p>

      {/* ------------------------------------------------------------ banners */}
      {searchParams.scheduleCreated && (
        <Banner>Weekly schedule saved — the slots are live on the booking page now.</Banner>
      )}
      {searchParams.scheduleRemoved && (
        <Banner>
          Schedule removed and its open slots taken off the booking page.
          {kept > 0 && ` ${kept} slot${kept === 1 ? " that's" : "s that are"} already booked stayed — cancel those below if needed.`}
        </Banner>
      )}
      {searchParams.blocked && (
        <Banner>
          Done — {searchParams.blocked} open slot{searchParams.blocked === "1" ? "" : "s"} removed.
          {kept > 0 && ` ${kept} already-booked slot${kept === 1 ? " was" : "s were"} left alone — cancel ${kept === 1 ? "it" : "them"} below if you can't make it.`}
        </Banner>
      )}
      {searchParams.scheduleError && <Banner error>Couldn&apos;t save the schedule: {searchParams.scheduleError}.</Banner>}
      {searchParams.blockError && <Banner error>Pick a valid date (the end date can&apos;t be before the start).</Banner>}

      {/* ---------------------------------------------------- weekly schedules */}
      <section id="schedules" className="mt-8 border border-ink/10 bg-paper p-6">
        <h2 className="font-display text-lg uppercase">Weekly schedules</h2>
        <p className="mt-1 text-sm text-graphite">
          Set it once and it repeats every week with no end. Booking slots are always open {SCHEDULE_HORIZON_DAYS / 7}{" "}
          weeks ahead, and new weeks are added automatically.
        </p>

        {schedules.length > 0 && (
          <ul className="mt-6 divide-y divide-ink/10 border border-ink/10">
            {schedules.map((sch) => {
              const times = slotTimes(sch.firstStartTime, sch.lastStartTime, sch.intervalMinutes);
              return (
                <li key={sch.id} className="flex flex-wrap items-center justify-between gap-4 px-4 py-4">
                  <div>
                    <p className="font-medium">{sch.className}</p>
                    <p className="mt-1 text-sm text-graphite">
                      {describeDays(sch.daysOfWeek)} · {times.length} session{times.length === 1 ? "" : "s"} a day,{" "}
                      {formatClock(sch.firstStartTime)}
                      {times.length > 1 && ` to ${formatClock(times[times.length - 1])} (last start)`} · {sch.durationMinutes} min ·{" "}
                      {sch.maxSeats} seat{sch.maxSeats === 1 ? "" : "s"} each
                    </p>
                    <p className="mt-1 text-xs text-graphite">
                      {sch.endDate ? `Runs until ${sch.endDate}` : "Runs forever"} · {sch.location} ·{" "}
                      {openSlotsBySchedule.get(sch.id) ?? 0} open slots on the booking page right now
                    </p>
                  </div>
                  <form action={deleteWeeklyScheduleAction}>
                    <input type="hidden" name="scheduleId" value={sch.id} />
                    <ConfirmButton
                      confirmMessage={`Stop the ${sch.className} weekly schedule? Open slots come off the booking page. Anything already booked stays.`}
                      className="border border-ink/20 px-4 py-2 text-sm hover:border-blood hover:text-blood"
                    >
                      Stop this schedule
                    </ConfirmButton>
                  </form>
                </li>
              );
            })}
          </ul>
        )}

        <details className="mt-6" open={schedules.length === 0}>
          <summary className="cursor-pointer font-display text-sm uppercase tracking-wide text-blood">
            + Add a weekly schedule
          </summary>
          <form action={createWeeklyScheduleAction} className="mt-4 grid gap-4 md:grid-cols-3">
            <ClassDefaultsSelect classes={classOptions} />
            <div className="md:col-span-2">
              <p className="mb-2 block font-display text-xs uppercase tracking-wide">Which days</p>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                  <label
                    key={d}
                    className="flex cursor-pointer items-center gap-2 border border-ink/20 px-3 py-2.5 text-sm has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-paper"
                  >
                    <input type="checkbox" name="days" value={d} defaultChecked={d >= 1 && d <= 6} className="sr-only" />
                    {WEEKDAY_LABELS[d]}
                  </label>
                ))}
              </div>
            </div>
            <TextField name="firstStartTime" label="First session starts" type="time" defaultValue="10:00" step={900} required />
            <TextField name="lastStartTime" label="Last session starts" type="time" defaultValue="17:00" step={900} required />
            <TextField
              name="intervalMinutes"
              label="A new session every (min)"
              type="number"
              defaultValue="60"
              required
              hint="60 = on the hour, every hour"
            />
            <TextField name="durationMinutes" label="Each session lasts (min)" type="number" defaultValue="60" required />
            <TextField name="maxSeats" label="Students per session" type="number" defaultValue="1" required />
            <TextField name="location" label="Location" defaultValue={DEFAULT_LOCATION} required />
            <TextField name="startDate" label="Starting from" type="date" defaultValue={today} required />
            <TextField name="endDate" label="Ending on (leave blank = forever)" type="date" />
            <div className="md:col-span-3">
              <label className="mb-2 block font-display text-xs uppercase tracking-wide">
                Notes (shown to booked students, optional)
              </label>
              <textarea name="notes" rows={2} className="w-full border border-ink/20 bg-paper px-4 py-3 text-sm focus:border-ink" />
            </div>
            <div className="md:col-span-3">
              <button className="bg-ink px-6 py-3 font-display text-sm uppercase tracking-wide text-paper hover:bg-blood">
                Save weekly schedule
              </button>
            </div>
          </form>
        </details>

        {schedules.length > 0 && (
          <div className="mt-6 border-t border-ink/10 pt-6">
            <h3 className="font-display text-sm uppercase">Taking a day off?</h3>
            <p className="mt-1 text-sm text-graphite">
              Removes all open weekly slots on those days. Anything already booked is left alone.
            </p>
            <form action={blockOutDaysAction} className="mt-3 flex flex-wrap items-end gap-3">
              <TextField name="fromDate" label="From" type="date" required />
              <TextField name="toDate" label="To (optional)" type="date" />
              <ConfirmButton
                confirmMessage="Remove all open weekly slots on these days?"
                className="border border-ink px-5 py-3 font-display text-sm uppercase tracking-wide hover:bg-ink hover:text-paper"
              >
                Block out
              </ConfirmButton>
            </form>
          </div>
        )}
      </section>

      {/* ---------------------------------------------------- one-off dates */}
      <section className="mt-8 border border-ink/10 bg-paper p-6">
        <details>
          <summary className="cursor-pointer font-display text-lg uppercase">+ Add a one-off date</summary>
          <form action={createSessionAction} className="mt-4 grid gap-4 md:grid-cols-3">
            <ClassDefaultsSelect classes={classOptions} />
            <TextField name="date" label="Date" type="date" defaultValue={today} required />
            <TextField name="time" label="Start time" type="time" step={900} required />
            <TextField name="durationMinutes" label="Lasts (min)" type="number" defaultValue="120" required />
            <TextField name="maxSeats" label="Students" type="number" defaultValue="8" required />
            <TextField name="location" label="Location" defaultValue={DEFAULT_LOCATION} required />
            <SelectField name="repeat" label="Repeat">
              <option value="none">Just this one</option>
              <option value="weekly">Weekly</option>
              <option value="fortnightly">Fortnightly</option>
            </SelectField>
            <TextField name="occurrences" label="How many times" type="number" defaultValue="1" />
            <div className="md:col-span-3">
              <label className="mb-2 block font-display text-xs uppercase tracking-wide">
                Notes (shown to booked students)
              </label>
              <textarea name="notes" rows={2} className="w-full border border-ink/20 bg-paper px-4 py-3 text-sm focus:border-ink" />
            </div>
            <div className="md:col-span-3">
              <button className="bg-ink px-6 py-3 font-display text-sm uppercase tracking-wide text-paper hover:bg-blood">
                Add date(s)
              </button>
            </div>
          </form>
        </details>
      </section>

      {/* ---------------------------------------------------- upcoming list */}
      <section className="mt-10">
        <h2 className="font-display text-lg uppercase">Coming up</h2>
        <p className="mt-1 text-sm text-graphite">
          One-off dates, plus any weekly slots someone has booked.
          {hiddenOpenSlots > 0 && ` ${hiddenOpenSlots} open weekly slots aren't listed here — they're on the booking page.`}
        </p>
        {upcoming.length === 0 ? (
          <p className="mt-4 border border-ink/10 bg-paper px-4 py-6 text-sm text-graphite">Nothing coming up yet.</p>
        ) : (
          <SessionTable>{upcoming.map(renderRow)}</SessionTable>
        )}
      </section>

      {past.length > 0 && (
        <details className="mt-10">
          <summary className="cursor-pointer font-display text-sm uppercase tracking-wide text-graphite">
            Past dates ({past.length})
          </summary>
          <SessionTable>{past.slice(0, 100).map(renderRow)}</SessionTable>
        </details>
      )}
    </div>
  );
}

function Banner({ children, error }: { children: React.ReactNode; error?: boolean }) {
  return (
    <p
      className={
        error
          ? "mt-4 border border-blood bg-blood/5 px-4 py-3 text-sm text-blood"
          : "mt-4 border border-ink/10 bg-paper px-4 py-3 text-sm"
      }
    >
      {children}
    </p>
  );
}

function SessionTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 overflow-x-auto border border-ink/10 bg-paper">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="border-b border-ink/10 bg-cloud text-left">
          <tr>
            <th className="px-4 py-3 font-display text-xs uppercase">Class</th>
            <th className="px-4 py-3 font-display text-xs uppercase">When</th>
            <th className="px-4 py-3 font-display text-xs uppercase">Location</th>
            <th className="px-4 py-3 font-display text-xs uppercase">Students</th>
            <th className="px-4 py-3 font-display text-xs uppercase">Status</th>
            <th className="px-4 py-3 font-display text-xs uppercase">Actions</th>
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
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
  hint,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
  step?: number;
  hint?: string;
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
      {hint && <p className="mt-1 text-xs text-graphite">{hint}</p>}
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
