import { formatCents, formatSessionDateShort, formatSessionTime } from "@/lib/utils";
import type { BookableSession } from "@/components/booking/booking-browser";
import { cn } from "@/lib/utils";

export function SessionCard({
  session,
  onSelect,
}: {
  session: BookableSession;
  onSelect: () => void;
}) {
  const soldOut = session.seatsRemaining === 0;
  const low = session.seatsRemaining > 0 && session.seatsRemaining <= 2;
  const startsAt = new Date(session.startsAt);

  return (
    <button
      onClick={onSelect}
      disabled={soldOut}
      className={cn(
        "group flex h-full flex-col border border-ink/15 bg-paper p-6 text-left transition-colors",
        soldOut ? "cursor-not-allowed opacity-50" : "hover:border-ink",
      )}
    >
      <p className="font-display text-xs uppercase tracking-widest text-blood">
        {session.className}
      </p>
      <p className="mt-3 font-display text-2xl uppercase">{formatSessionDateShort(startsAt)}</p>
      <p className="mt-1 text-sm text-graphite">{formatSessionTime(startsAt)}</p>
      <p className="mt-4 text-sm text-graphite">{session.location}</p>

      <div className="mt-auto flex items-end justify-between pt-6">
        <span className="font-display text-xl">{formatCents(session.priceCents, session.currency.toUpperCase())}</span>
        <span
          className={cn(
            "font-display text-xs uppercase tracking-wide",
            soldOut ? "text-graphite" : low ? "text-blood" : "text-graphite",
          )}
        >
          {soldOut
            ? "Sold Out"
            : low
              ? `${session.seatsRemaining} seat${session.seatsRemaining === 1 ? "" : "s"} left`
              : `${session.seatsRemaining} of ${session.maxSeats} seats left`}
        </span>
      </div>
    </button>
  );
}
