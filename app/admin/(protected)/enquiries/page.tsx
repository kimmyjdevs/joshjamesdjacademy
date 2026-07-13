import { desc } from "drizzle-orm";
import { db } from "@/db";
import { enquiries } from "@/db/schema";

export default async function AdminEnquiriesPage() {
  const rows = await db.query.enquiries.findMany({ orderBy: desc(enquiries.createdAt) });

  return (
    <div>
      <h1 className="text-3xl">Enquiries</h1>

      <div className="mt-6 space-y-4">
        {rows.map((e) => (
          <div key={e.id} className="border border-ink/10 bg-paper p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-display text-lg">{e.name}</p>
              <p className="text-xs text-graphite">
                {new Intl.DateTimeFormat("en-AU", { dateStyle: "medium", timeStyle: "short" }).format(e.createdAt)}
              </p>
            </div>
            <p className="mt-1 text-sm text-graphite">
              {e.email}
              {e.experienceLevel ? ` · ${e.experienceLevel}` : ""}
            </p>
            <p className="mt-3 text-sm">{e.message}</p>
          </div>
        ))}
        {rows.length === 0 && (
          <div className="border border-ink/10 bg-paper p-8 text-center text-graphite">
            No enquiries yet.
          </div>
        )}
      </div>
    </div>
  );
}
