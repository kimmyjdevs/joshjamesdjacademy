"use client";

import { useEffect, useRef } from "react";

type ClassOption = { id: number; name: string; durationMinutes: number; maxSeatsDefault: number };

/**
 * Class picker that fills the surrounding form's duration + seats fields
 * with that class's own defaults, so Josh doesn't have to remember that
 * UpBeat is 90 min / 1 seat every time.
 */
export function ClassDefaultsSelect({ classes, label = "Class" }: { classes: ClassOption[]; label?: string }) {
  const ref = useRef<HTMLSelectElement>(null);

  function apply(select: HTMLSelectElement) {
    const chosen = classes.find((c) => String(c.id) === select.value);
    const form = select.form;
    if (!chosen || !form) return;
    const duration = form.elements.namedItem("durationMinutes");
    const seats = form.elements.namedItem("maxSeats");
    if (duration instanceof HTMLInputElement) duration.value = String(chosen.durationMinutes);
    if (seats instanceof HTMLInputElement) seats.value = String(chosen.maxSeatsDefault);
  }

  useEffect(() => {
    if (ref.current) apply(ref.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <label className="mb-2 block font-display text-xs uppercase tracking-wide">{label}</label>
      <select
        ref={ref}
        name="classTypeId"
        required
        onChange={(e) => apply(e.currentTarget)}
        className="w-full border border-ink/20 bg-paper px-4 py-3 text-sm focus:border-ink"
      >
        {classes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}
