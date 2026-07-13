import { asc } from "drizzle-orm";
import { db } from "@/db";
import { classTypes } from "@/db/schema";
import { createClassTypeAction, updateClassTypeAction } from "@/lib/admin-actions";

export default async function AdminClassTypesPage() {
  const types = await db.query.classTypes.findMany({ orderBy: asc(classTypes.sortOrder) });

  return (
    <div>
      <h1 className="text-3xl">Class Types</h1>
      <p className="mt-2 text-graphite">Price and duration changes only affect future checkouts.</p>

      <div className="mt-8 space-y-6">
        {types.map((ct) => (
          <form
            key={ct.id}
            action={updateClassTypeAction}
            className="border border-ink/10 bg-paper p-6"
          >
            <input type="hidden" name="id" value={ct.id} />
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg uppercase">{ct.name}</h2>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="isActive" defaultChecked={ct.isActive} />
                Active
              </label>
            </div>

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
                <label className="mb-2 block font-display text-xs uppercase tracking-wide">Duration (min)</label>
                <input
                  name="durationMinutes"
                  type="number"
                  defaultValue={ct.durationMinutes}
                  required
                  className="w-full border border-ink/20 bg-paper px-4 py-3 text-sm focus:border-ink"
                />
              </div>
              <div>
                <label className="mb-2 block font-display text-xs uppercase tracking-wide">Default max seats</label>
                <input
                  name="maxSeatsDefault"
                  type="number"
                  defaultValue={ct.maxSeatsDefault}
                  required
                  className="w-full border border-ink/20 bg-paper px-4 py-3 text-sm focus:border-ink"
                />
              </div>
            </div>

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

            <button className="mt-4 bg-ink px-6 py-3 font-display text-sm uppercase tracking-wide text-paper hover:bg-blood">
              Save Changes
            </button>
          </form>
        ))}
      </div>

      <section className="mt-10 border border-ink/10 bg-paper p-6">
        <h2 className="font-display text-lg uppercase">Add a Class Type</h2>
        <form action={createClassTypeAction} className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block font-display text-xs uppercase tracking-wide">Name</label>
            <input name="name" required className="w-full border border-ink/20 bg-paper px-4 py-3 text-sm focus:border-ink" />
          </div>
          <div>
            <label className="mb-2 block font-display text-xs uppercase tracking-wide">Slug</label>
            <input name="slug" required placeholder="e.g. weekend-intensive" className="w-full border border-ink/20 bg-paper px-4 py-3 text-sm focus:border-ink" />
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
            <label className="mb-2 block font-display text-xs uppercase tracking-wide">Duration (min)</label>
            <input name="durationMinutes" type="number" required className="w-full border border-ink/20 bg-paper px-4 py-3 text-sm focus:border-ink" />
          </div>
          <div>
            <label className="mb-2 block font-display text-xs uppercase tracking-wide">Default max seats</label>
            <input name="maxSeatsDefault" type="number" required className="w-full border border-ink/20 bg-paper px-4 py-3 text-sm focus:border-ink" />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block font-display text-xs uppercase tracking-wide">Description</label>
            <textarea name="description" rows={3} required className="w-full border border-ink/20 bg-paper px-4 py-3 text-sm focus:border-ink" />
          </div>
          <div className="md:col-span-2">
            <button className="bg-ink px-6 py-3 font-display text-sm uppercase tracking-wide text-paper hover:bg-blood">
              Create Class Type
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
