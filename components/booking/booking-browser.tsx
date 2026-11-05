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

  const [chosenDay, setChosenDay] = useState<string | null>(null);

  const filtered = useMemo(
    () => (filter === "all" ? sessions : sessions.filter((s) => s.classSlug === filter)),
    [sessions, filter],
  );

  // Weekly schedules can produce hundreds of slots — past a handful, switch
  // from one big card grid to "pick a day, then a time".
  const days = useMemo(() => groupByDay(filtered), [filtered]);
  const useDayPicker = filtered.length > 12 && days.length > 1;
  const firstOpenDay = days.find((d) => d.sessions.some((s) => s.seatsRemaining > 0))?.key ?? days[0]?.key;
  const selectedDay = days.find((d) => d.key === chosenDay) ?? days.find((d) => d.key === firstOpenDay);
  const visible = useDayPicker ? (selectedDay?.sessions ?? []) : filtered;

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
        <>
        {useDayPicker && (
          <div className="mb-8">
            <p className="mb-3 font-display text-sm uppercase tracking-widest">Pick a day</p>
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2" role="group" aria-label="Pick a day">
              {days.map((d) => {
                const open = d.sessions.some((s) => s.seatsRemaining > 0);
                const active = d.key === selectedDay?.key;
                return (
                  <button
                    key={d.key}
                    onClick={() => setChosenDay(d.key)}
                    disabled={!open}
                    aria-pressed={active}
                    className={cn(
                      "flex min-w-[4.5rem] shrink-0 flex-col items-center border px-3 py-2 transition-colors",
                      active ? "border-ink bg-ink text-paper" : "border-ink/20 hover:border-ink",
                      !open && "cursor-not-allowed opacity-40 hover:border-ink/20",
                    )}
                  >
                    <span className="font-display text-xs uppercase">{d.weekday}</span>
                    <span className="font-display text-xl">{d.dayNum}</span>
                    <span className="text-xs">{d.month}</span>
                  </button>
                );
              })}
            </div>
            {selectedDay && (
              <p className="mt-6 font-display text-sm uppercase tracking-widest">
                Times on {selectedDay.weekday} {selectedDay.dayNum} {selectedDay.month}
              </p>
            )}
          </div>
        )}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              onSelect={() => setActiveSession(session)}
            />
          ))}
        </div>
        </>
      )}

      <SessionDetailPanel session={activeSession} onClose={() => setActiveSession(null)} />
    </div>
  );
}

const dayParts = new Intl.DateTimeFormat("en-AU", {
  timeZone: "Australia/Brisbane",
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});

function groupByDay(list: BookableSession[]) {
  const map = new Map<string, { key: string; weekday: string; dayNum: string; month: string; sessions: BookableSession[] }>();
  for (const s of list) {
    const parts = Object.fromEntries(dayParts.formatToParts(new Date(s.startsAt)).map((p) => [p.type, p.value]));
    const key = `${parts.year}-${parts.month}-${parts.day}`;
    if (!map.has(key)) {
      map.set(key, { key, weekday: parts.weekday, dayNum: parts.day, month: parts.month, sessions: [] });
    }
    map.get(key)!.sessions.push(s);
  }
  // Input is already sorted by start time, so insertion order is chronological.
  return [...map.values()];
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
