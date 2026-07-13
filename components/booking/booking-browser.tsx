"use client";

import { useMemo, useState } from "react";
import type { ClassType } from "@/db/schema";
import { SessionCard } from "@/components/booking/session-card";
import { SessionDetailPanel } from "@/components/booking/session-detail-panel";
import { XMark } from "@/components/x-mark";
import { cn } from "@/lib/utils";

export type BookableSession = {
  id: number;
  classTypeId: number;
  startsAt: string;
  endsAt: string;
  location: string;
  maxSeats: number;
  notes: string | null;
  className: string;
  classSlug: string;
  level: string;
  durationMinutes: number;
  priceCents: number;
  currency: string;
  description: string;
  seatsRemaining: number;
};

export function BookingBrowser({
  sessions,
  classTypes,
}: {
  sessions: BookableSession[];
  classTypes: ClassType[];
}) {
  const [filter, setFilter] = useState<string>("all");
  const [activeSession, setActiveSession] = useState<BookableSession | null>(null);

  const filtered = useMemo(
    () => (filter === "all" ? sessions : sessions.filter((s) => s.classSlug === filter)),
    [sessions, filter],
  );

  return (
    <div>
      <div className="mb-10 flex flex-wrap gap-3" role="group" aria-label="Filter by class type">
        <FilterChip label="All Classes" active={filter === "all"} onClick={() => setFilter("all")} />
        {classTypes.map((ct) => (
          <FilterChip
            key={ct.slug}
            label={ct.name}
            active={filter === ct.slug}
            onClick={() => setFilter(ct.slug)}
          />
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="border border-ink/10 bg-cloud px-8 py-16 text-center">
          <XMark className="mx-auto mb-4 h-6 w-6" color="red" />
          <p className="font-display text-xl uppercase">Nothing on the calendar yet.</p>
          <p className="mx-auto mt-3 max-w-md text-graphite">
            New dates drop soon — hit the contact page and we&apos;ll let you know first.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              onSelect={() => setActiveSession(session)}
            />
          ))}
        </div>
      )}

      <SessionDetailPanel session={activeSession} onClose={() => setActiveSession(null)} />
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "border px-4 py-2 font-display text-xs uppercase tracking-wide transition-colors",
        active
          ? "border-ink bg-ink text-paper"
          : "border-ink/20 bg-transparent text-ink hover:border-ink",
      )}
    >
      {label}
    </button>
  );
}
