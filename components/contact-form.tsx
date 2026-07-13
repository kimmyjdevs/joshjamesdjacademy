"use client";

import { useState } from "react";

const experienceLevels = [
  "Never touched a deck",
  "Bedroom DJ",
  "Played a few gigs",
  "Working DJ",
];

export function ContactForm() {
  const [status, setStatus] = useState<"idle" | "submitting" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);

    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Something went wrong. Try again.");
        setStatus("error");
        return;
      }

      setStatus("sent");
      form.reset();
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="border border-ink/10 bg-cloud p-8 text-center">
        <p className="font-display text-xl uppercase">Message sent.</p>
        <p className="mt-2 text-graphite">We&apos;ll get back to you shortly.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Honeypot — hidden from real users, bots often fill every field */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
        aria-hidden="true"
      />

      <div>
        <label className="mb-2 block font-display text-xs uppercase tracking-wide">Name</label>
        <input
          name="name"
          type="text"
          required
          className="w-full border border-ink/20 bg-paper px-4 py-3 text-sm focus:border-ink"
        />
      </div>

      <div>
        <label className="mb-2 block font-display text-xs uppercase tracking-wide">Email</label>
        <input
          name="email"
          type="email"
          required
          className="w-full border border-ink/20 bg-paper px-4 py-3 text-sm focus:border-ink"
        />
      </div>

      <div>
        <label className="mb-2 block font-display text-xs uppercase tracking-wide">
          DJ experience level
        </label>
        <select
          name="experienceLevel"
          defaultValue=""
          className="w-full border border-ink/20 bg-paper px-4 py-3 text-sm focus:border-ink"
        >
          <option value="">Prefer not to say</option>
          {experienceLevels.map((lvl) => (
            <option key={lvl} value={lvl}>
              {lvl}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block font-display text-xs uppercase tracking-wide">Message</label>
        <textarea
          name="message"
          rows={5}
          required
          className="w-full border border-ink/20 bg-paper px-4 py-3 text-sm focus:border-ink"
        />
      </div>

      {error && (
        <p role="alert" className="border border-blood bg-blood/5 px-4 py-3 text-sm text-blood">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="bg-ink px-8 py-4 font-display text-sm uppercase tracking-wide text-paper transition-colors hover:bg-blood disabled:opacity-60"
      >
        {status === "submitting" ? "Sending…" : "Send Message"}
      </button>
    </form>
  );
}
