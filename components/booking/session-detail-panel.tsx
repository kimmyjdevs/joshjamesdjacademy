"use client";

import { useEffect, useState } from "react";
import { formatCents, formatSessionDate, formatSessionTime } from "@/lib/utils";
import type { BookableSession } from "@/components/booking/booking-browser";
import { XMark } from "@/components/x-mark";
import { cn } from "@/lib/utils";

export function SessionDetailPanel({
  session,
  onClose,
}: {
  session: BookableSession | null;
  onClose: () => void;
}) {
  const [seats, setSeats] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSeats(1);
    setName("");
    setEmail("");
    setPhone("");
    setError(null);
  }, [session?.id]);

  useEffect(() => {
    document.body.style.overflow = session ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [session]);

  if (!session) return null;

  const startsAt = new Date(session.startsAt);
  const maxSelectable = Math.min(2, session.seatsRemaining);
  const total = session.priceCents * seats;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/bookings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id, seats, name, email, phone: phone || undefined }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Try again.");
        setSubmitting(false);
        return;
      }

      window.location.href = data.checkoutUrl;
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex justify-end">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-ink/60"
      />
      <div className="relative flex h-full w-full max-w-lg flex-col overflow-y-auto bg-paper shadow-xl md:w-[480px]">
        <div className="flex items-center justify-between border-b border-ink/10 px-6 py-5">
          <p className="font-display text-sm uppercase tracking-wide text-blood">
            {session.className}
          </p>
          <button onClick={onClose} aria-label="Close session details" className="p-2">
            <XMark className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 px-6 py-6">
          <h2 className="text-2xl leading-tight">{formatSessionDate(startsAt)}</h2>
          <p className="mt-1 text-graphite">{formatSessionTime(startsAt)}</p>
          <p className="mt-4 text-sm leading-relaxed text-graphite">{session.description}</p>

          <dl className="mt-6 grid grid-cols-2 gap-4 border-y border-ink/10 py-6 text-sm">
            <div>
              <dt className="text-graphite">Location</dt>
              <dd className="mt-1 font-medium">{session.location}</dd>
            </div>
            <div>
              <dt className="text-graphite">Duration</dt>
              <dd className="mt-1 font-medium">{session.durationMinutes} minutes</dd>
            </div>
            <div>
              <dt className="text-graphite">Level</dt>
              <dd className="mt-1 font-medium capitalize">{session.level}</dd>
            </div>
            <div>
              <dt className="text-graphite">Seats left</dt>
              <dd className="mt-1 font-medium">{session.seatsRemaining} of {session.maxSeats}</dd>
            </div>
          </dl>

          {session.notes && (
            <div className="mt-6 bg-cloud p-4">
              <p className="font-display text-xs uppercase tracking-wide text-graphite">
                What to bring
              </p>
              <p className="mt-2 text-sm">{session.notes}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="mb-2 block font-display text-xs uppercase tracking-wide">
                Seats
              </label>
              <div className="flex gap-2">
                {Array.from({ length: maxSelectable }, (_, i) => i + 1).map((n) => (
                  <button
                    type="button"
                    key={n}
                    onClick={() => setSeats(n)}
                    className={cn(
                      "h-11 w-11 border font-display text-sm transition-colors",
                      seats === n ? "border-ink bg-ink text-paper" : "border-ink/20 hover:border-ink",
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-graphite">Bring a mate — up to 2 seats per booking.</p>
            </div>

            <Field label="Full name" value={name} onChange={setName} required autoComplete="name" />
            <Field label="Email" value={email} onChange={setEmail} required type="email" autoComplete="email" />
            <Field label="Phone (optional)" value={phone} onChange={setPhone} type="tel" autoComplete="tel" />

            {error && (
              <p role="alert" className="border border-blood bg-blood/5 px-4 py-3 text-sm text-blood">
                {error}
              </p>
            )}

            <div className="flex items-center justify-between border-t border-ink/10 pt-5">
              <div>
                <p className="text-xs uppercase tracking-wide text-graphite">Total (GST inc.)</p>
                <p className="font-display text-2xl">{formatCents(total, session.currency.toUpperCase())}</p>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="bg-ink px-6 py-4 font-display text-sm uppercase tracking-wide text-paper transition-colors hover:bg-blood disabled:opacity-60"
              >
                {submitting ? "Redirecting…" : "Secure My Seat"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <div>
      <label className="mb-2 block font-display text-xs uppercase tracking-wide">
        {label}
      </label>
      <input
        type={type}
        required={required}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-ink/20 bg-paper px-4 py-3 text-sm focus:border-ink"
      />
    </div>
  );
}
