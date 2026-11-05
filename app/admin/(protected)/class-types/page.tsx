import Link from "next/link";
import { and, asc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { classTypes, sessions } from "@/db/schema";
import { createClassTypeAction, updateClassTypeAction, deleteClassTypeAction } from "@/lib/admin-actions";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { ensureScheduledSessions } from "@/lib/schedules";

function toDateInputValue(date: Date | null) {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export default async function AdminClassTypesPage() {
  await ensureScheduledSessions();
  const [types, sessionCountRows, upcomingRows] = await Promise.all([
    db.query.classTypes.findMany({ orderBy: asc(classTypes.sortOrder) }),
    db
      .select({ classTypeId: sessions.classTypeId, count: sql<string>`count(*)` })
      .from(sessions)
      .groupBy(sessions.classTypeId),
    db
      .select({ classTypeId: sessions.classTypeId, count: sql<string>`count(*)` })
      .from(sessions)
      .where(and(eq(sessions.status, "scheduled"), gte(sessions.startsAt, new Date())))
      .groupBy(sessions.classTypeId),
  ]);
  const sessionCounts = new Map(sessionCountRows.map((r) => [r.classTypeId, Number(r.count)]));
  const upcomingCounts = new Map(upcomingRows.map((r) => [r.classTypeId, Number(r.count)]));

  return (
    <div>
      <h1 className="text-3xl">Classes</h1>
      <p className="mt-2 max-w-3xl text-graphite">
        This is what you offer: name, price, length and description. Students can only book a class once it has
        dates, which you add under <Link href="/admin/sessions" className="text-blood hover:underline">Dates &amp; Times</Link>.
        Price changes only affect new bookings.
      </p>

      <div className="mt-8 space-y-6">
        {types.map((ct) => {
          const sessionCount = sessionCounts.get(ct.id) ?? 0;
          const upcoming = upcomingCounts.get(ct.id) ?? 0;
          const now = new Date();
          const notYet = ct.availableFrom && ct.availableFrom > now;
          const ended = ct.availableUntil && ct.availableUntil < now;
          return (
          <form
            key={ct.id}
            action={updateClassTypeAction}
            className="border border-ink/10 bg-paper p-6"
          >
            <input type="hidden" name="id" value={ct.id} />
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="font-display text-lg uppercase">{ct.name}</h2>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="isActive" defaultChecked={ct.isActive} />
                  Active
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="refundable" defaultChecked={ct.refundable} />
                  Fully refundable
                </label>
              </div>
            </div>

            {!ct.isActive ? (
              <p className="mt-3 border border-ink/10 bg-cloud px-4 py-2 text-sm text-graphite">
                Hidden — &quot;Active&quot; is unticked, so this isn&apos;t on the booking page.
              </p>
            ) : ended ? (
              <p className="mt-3 border border-blood bg-blood/5 px-4 py-2 text-sm text-blood">
                Not bookable — the &quot;Bookable until&quot; date below has passed. Clear it or move it later.
              </p>
            ) : upcoming === 0 ? (
              <p className="mt-3 border border-blood bg-blood/5 px-4 py-2 text-sm text-blood">
                ⚠ No upcoming dates — students can&apos;t book this yet.{" "}
                <Link href="/admin/sessions#schedules" className="font-medium underline">
                  Add dates →
                </Link>
              </p>
            ) : (
              <p className="mt-3 border border-ink/10 bg-cloud px-4 py-2 text-sm">
                ✓ {upcoming} upcoming date{upcoming === 1 ? "" : "s"} on the booking page
                {notYet && ` (from ${ct.availableFrom!.toLocaleDateString("en-AU", { timeZone: "Australia/Brisbane" })})`}.{" "}
                <Link href="/admin/sessions" className="text-blood hover:underline">
                  Manage dates →
                </Link>
              </p>
            )}

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block font-display text-xs uppercase tracking-wide">Name</label>
                <input name="name" defaultValue={ct.name} required className="w-full border border-ink/20 bg-paper px-4 py-3 text-sm focus:border-ink" />
              </div>
              <div>
                <label className="mb-2 block font-display text-xs uppercase tracking-wide">Level</label>
                <select name="level" defaultValue={ct.level} className="w-full border border-ink/20 bg-paper px-4 py-3 text-sm focus:border-ink">
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="all">All Levels</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block font-display text-xs uppercase tracking-wide">Price (AUD)</label>
                <input
                  name="price"
                  type="number"
                  step="0.01"
                  defaultValue={(ct.priceCents / 100).toFixed(2)}
                  required
                  className="w-full border border-ink/20 bg-paper px-4 py-3 text-sm focus:border-ink"
                />
              </div>
              <div>
                <label className="mb-2 block font-display text-xs uppercase tracking-wide">Length (minutes)</label>
                <input
                  name="durationMinutes"
                  type="number"
                  defaultValue={ct.durationMinutes}
                  required
                  className="w-full border border-ink/20 bg-paper px-4 py-3 text-sm focus:border-ink"
                />
              </div>
              <div>
                <label className="mb-2 block font-display text-xs uppercase tracking-wide">Students per session</label>
                <input
                  name="maxSeatsDefault"
                  type="number"
                  defaultValue={ct.maxSeatsDefault}
                  required
                  className="w-full border border-ink/20 bg-paper px-4 py-3 text-sm focus:border-ink"
                />
              </div>
              <div>
                <label className="mb-2 block font-display text-xs uppercase tracking-wide">
                  Bookable from (optional)
                </label>
                <input
                  name="availableFrom"
                  type="date"
                  defaultValue={toDateInputValue(ct.availableFrom)}
                  className="w-full border border-ink/20 bg-paper px-4 py-3 text-sm focus:border-ink"
                />
              </div>
              <div>
                <label className="mb-2 block font-display text-xs uppercase tracking-wide">
                  Bookable until (optional)
                </label>
                <input
                  name="availableUntil"
                  type="date"
                  defaultValue={toDateInputValue(ct.availableUntil)}
                  className="w-full border border-ink/20 bg-paper px-4 py-3 text-sm focus:border-ink"
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-graphite">
              Leave both dates blank for a class that runs all year. Only set them for something seasonal (e.g. a
              school holiday program) — the class disappears from the booking page once the end date passes, even if
              it still has dates.
            </p>

            <div className="mt-4">
              <label className="mb-2 block font-display text-xs uppercase tracking-wide">Description</label>
              <textarea
                name="description"
                defaultValue={ct.description}
                rows={3}
                required
                className="w-full border border-ink/20 bg-paper px-4 py-3 text-sm focus:border-ink"
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-4">
              <button className="bg-ink px-6 py-3 font-display text-sm uppercase tracking-wide text-paper hover:bg-blood">
                Save Changes
              </button>
              {sessionCount === 0 ? (
                <ConfirmButton
                  formAction={deleteClassTypeAction}
                  confirmMessage={`Delete "${ct.name}"? This can't be undone.`}
                  className="text-sm text-graphite hover:text-blood hover:underline"
                >
                  Delete
                </ConfirmButton>
              ) : (
                <p className="text-xs text-graphite">
                  Can&apos;t delete — {sessionCount} session{sessionCount === 1 ? "" : "s"} scheduled.
                  Untick &quot;Active&quot; instead to hide it from booking.
                </p>
              )}
            </div>
          </form>
          );
        })}
      </div>

      <section className="mt-10 border border-ink/10 bg-paper p-6">
        <h2 className="font-display text-lg uppercase">Add a new class</h2>
        <form action={createClassTypeAction} className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block font-display text-xs uppercase tracking-wide">Name</label>
            <input name="name" required className="w-full border border-ink/20 bg-paper px-4 py-3 text-sm focus:border-ink" />
          </div>
          <div>
            <label className="mb-2 block font-display text-xs uppercase tracking-wide">Level</label>
            <select name="level" defaultValue="beginner" className="w-full border border-ink/20 bg-paper px-4 py-3 text-sm focus:border-ink">
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="all">All Levels</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block font-display text-xs uppercase tracking-wide">Price (AUD)</label>
            <input name="price" type="number" step="0.01" required className="w-full border border-ink/20 bg-paper px-4 py-3 text-sm focus:border-ink" />
          </div>
          <div>
            <label className="mb-2 block font-display text-xs uppercase tracking-wide">Length (minutes)</label>
            <input name="durationMinutes" type="number" required className="w-full border border-ink/20 bg-paper px-4 py-3 text-sm focus:border-ink" />
          </div>
          <div>
            <label className="mb-2 block font-display text-xs uppercase tracking-wide">Students per session</label>
            <input name="maxSeatsDefault" type="number" required className="w-full border border-ink/20 bg-paper px-4 py-3 text-sm focus:border-ink" />
          </div>
          <div>
            <label className="mb-2 block font-display text-xs uppercase tracking-wide">Bookable from (optional)</label>
            <input name="availableFrom" type="date" className="w-full border border-ink/20 bg-paper px-4 py-3 text-sm focus:border-ink" />
          </div>
          <div>
            <label className="mb-2 block font-display text-xs uppercase tracking-wide">Bookable until (optional)</label>
            <input name="availableUntil" type="date" className="w-full border border-ink/20 bg-paper px-4 py-3 text-sm focus:border-ink" />
          </div>
          <div className="flex items-center">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="refundable" defaultChecked />
              Fully refundable
            </label>
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block font-display text-xs uppercase tracking-wide">Description</label>
            <textarea name="description" rows={3} required className="w-full border border-ink/20 bg-paper px-4 py-3 text-sm focus:border-ink" />
          </div>
          <div className="md:col-span-2">
            <button className="bg-ink px-6 py-3 font-display text-sm uppercase tracking-wide text-paper hover:bg-blood">
              Create class
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
