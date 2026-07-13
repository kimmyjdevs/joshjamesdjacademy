"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function Accordion({
  items,
}: {
  items: { question: string; answer: string }[];
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="divide-y divide-ink/10 border-y border-ink/10">
      {items.map((item, i) => {
        const open = openIndex === i;
        return (
          <div key={item.question}>
            <button
              onClick={() => setOpenIndex(open ? null : i)}
              aria-expanded={open}
              className="flex w-full items-center justify-between gap-4 py-5 text-left"
            >
              <span className="font-display text-base uppercase tracking-tight md:text-lg">
                {item.question}
              </span>
              <ChevronDown
                className={cn("h-5 w-5 shrink-0 transition-transform", open && "rotate-180 text-blood")}
              />
            </button>
            {open && <p className="pb-5 text-sm leading-relaxed text-graphite">{item.answer}</p>}
          </div>
        );
      })}
    </div>
  );
}
