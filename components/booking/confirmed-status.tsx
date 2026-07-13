"use client";

import { useEffect, useState } from "react";
import { formatCents, formatSessionDate, formatSessionTime } from "@/lib/utils";
import { XMark } from "@/components/x-mark";

type StatusResponse =
  | { status: "pending" }
  | { status: "cancelled" }
  | { status: "expired" }
  | { status: "not_found" }
  | {
      status: "confirmed";
      booking: { customerName: string; seats: number; amountPaidCents: number | null };
      session: {
        className: string;
        startsAt: string;
        endsAt: string;
        location: string;
        notes: string | null;
      };
      calendar: { googleUrl: string; icsUrl: string };
    };

export function ConfirmedStatus({ checkoutSessionId }: { checkoutSessionId: string }) {
  const [data, setData] = useState<StatusResponse | null>(null);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      const res = await fetch(`/api/booking/status?session_id=${encodeURIComponent(checkoutSessionId)}`);
      const json: StatusResponse = await res.json();
      if (cancelled) return;
      setData(json);
      if (json.status !== "confirmed" && attempts < 10) {
        setTimeout(() => setAttempts((a) => a + 1), 2000);
      }
    }

    poll();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempts]);

  if (!data) {
    return <StatusShell heading="Checking your booking…" body="Give us one second." />;
  }

  if (data.status === "not_found") {
    return (
      <StatusShell
        heading="We couldn't find that booking."
        body="If you just paid, check your email — the confirmation can take a minute to land. Otherwise head back and grab a session."
      />
    );
  }

  if (data.status === "expired" || data.status === "cancelled") {
    return (
      <StatusShell
        heading="That checkout didn't go through."
        body="No charge was made. Head back to booking and grab the next available session."
      />
    );
  }

  if (data.status === "pending") {
    return <StatusShell heading="Payment processing…" body="This usually takes a few seconds. Hang tight." />;
  }

  const startsAt = new Date(data.session.startsAt);

  return (
    <div className="mx-auto max-w-xl">
      <XMark className="mb-4 h-6 w-6" color="red" />
      <p className="mb-2 font-display text-sm uppercase tracking-widest text-blood">
        Seat Confirmed
      </p>
      <h1 className="text-4xl md:text-5xl">You&apos;re in, {data.booking.customerName.split(" ")[0]}.</h1>
      <p className="mt-4 text-graphite">
        Your seat for <strong className="text-ink">{data.session.className}</strong> is locked in.
        A confirmation email with your calendar invite is on its way.
      </p>

      <dl className="mt-8 grid grid-cols-2 gap-6 border-y border-ink/10 py-8 text-sm">
        <div>
          <dt className="text-graphite">Date</dt>
          <dd className="mt-1 font-display text-lg">{formatSessionDate(startsAt)}</dd>
        </div>
        <div>
          <dt className="text-graphite">Time</dt>
          <dd className="mt-1 font-display text-lg">{formatSessionTime(startsAt)}</dd>
        </div>
        <div>
          <dt className="text-graphite">Location</dt>
          <dd className="mt-1 font-medium">{data.session.location}</dd>
        </div>
        <div>
          <dt className="text-graphite">Seats / Paid</dt>
          <dd className="mt-1 font-medium">
            {data.booking.seats} · {data.booking.amountPaidCents ? formatCents(data.booking.amountPaidCents) : "—"}
          </dd>
        </div>
      </dl>

      {data.session.notes && (
        <div className="mt-6 bg-cloud p-4">
          <p className="font-display text-xs uppercase tracking-wide text-graphite">What to bring</p>
          <p className="mt-2 text-sm">{data.session.notes}</p>
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <a
          href={data.calendar.googleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="border border-ink px-6 py-3 font-display text-sm uppercase tracking-wide transition-colors hover:bg-ink hover:text-paper"
        >
          Add to Google Calendar
        </a>
        <a
          href={data.calendar.icsUrl}
          className="border border-ink px-6 py-3 font-display text-sm uppercase tracking-wide transition-colors hover:bg-ink hover:text-paper"
        >
          Download .ics
        </a>
      </div>
    </div>
  );
}

function StatusShell({ heading, body }: { heading: string; body: string }) {
  return (
    <div className="mx-auto max-w-xl text-center">
      <h1 className="text-3xl">{heading}</h1>
      <p className="mt-4 text-graphite">{body}</p>
    </div>
  );
}
