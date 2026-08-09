import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, eq, gte, isNull, lte, or } from "drizzle-orm";
import { db } from "@/db";
import { classTypes } from "@/db/schema";
import { formatCents } from "@/lib/utils";
import { Accordion } from "@/components/accordion";
import { BlurFade } from "@/components/magicui/blur-fade";
import { XMark } from "@/components/x-mark";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "DJ Course & Coaching Options",
  description:
    "Group DJ classes, 1-on-1 coaching, and the Club-Ready Program in Brisbane. Real curriculum, live pricing, book straight in.",
  alternates: { canonical: "/services" },
};

export const revalidate = 0;

const modules = [
  {
    question: "Module 1 — Setup",
    answer:
      "Leads, connections, and signal flow: RCA, XLR, TRS, IEC and USB. Know what every cable does so you can fix issues before or during a gig, not panic when something cuts out.",
  },
  {
    question: "Module 2 — Player Basics",
    answer:
      "Tempo, tempo range, master tempo, and the jog wheel. The controls that actually matter, and how to use them without over-adjusting.",
  },
  {
    question: "Module 3 — Mixer Basics",
    answer:
      "Cue/headphone audition, channel gain, EQ, and crossfader fundamentals — how to balance a mix so every transition can actually be heard.",
  },
  {
    question: "Module 4 — Understanding Music",
    answer:
      "BPM, key, and structure. Learn to count to 32, hear a phrase coming, and understand why harmonic mixing makes a set feel intentional instead of accidental.",
  },
  {
    question: "Module 5 — Mixing Techniques",
    answer:
      "Beat matching, timing, drop mixing, frequency transfers, energy, looping and effects. The goal: make two songs sound like one.",
  },
];

export default async function ServicesPage() {
  const tiers = await db.query.classTypes.findMany({
    where: and(
      eq(classTypes.isActive, true),
      or(isNull(classTypes.availableFrom), lte(classTypes.availableFrom, new Date())),
      or(isNull(classTypes.availableUntil), gte(classTypes.availableUntil, new Date())),
    ),
    orderBy: asc(classTypes.sortOrder),
  });

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: siteConfig.name,
      description: siteConfig.description,
      url: siteConfig.url,
      email: siteConfig.email,
      areaServed: "Brisbane, QLD",
      address: { "@type": "PostalAddress", addressLocality: "Brisbane", addressRegion: "QLD", addressCountry: "AU" },
    },
    ...tiers.map((t) => ({
      "@context": "https://schema.org",
      "@type": "Course",
      name: t.name,
      description: t.description,
      provider: { "@type": "Organization", name: siteConfig.name, sameAs: siteConfig.url },
      offers: {
        "@type": "Offer",
        price: (t.priceCents / 100).toFixed(2),
        priceCurrency: t.currency.toUpperCase(),
      },
    })),
  ];

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="container-x py-16 md:py-24">
        <BlurFade>
          <p className="mb-3 font-display text-sm uppercase tracking-widest text-blood">Services</p>
          <h1 className="max-w-2xl text-4xl md:text-5xl">Three ways in. One outcome — club-ready.</h1>
          <p className="mt-4 max-w-xl text-graphite">
            Prices below are live and GST-inclusive. Pick a tier, then book your seat straight
            from the booking page.
          </p>
        </BlurFade>
      </section>

      <section className="container-x pb-16 md:pb-24">
        <div className="grid gap-6 md:grid-cols-3">
          {tiers.map((tier, i) => (
            <BlurFade key={tier.id} delay={i * 0.08}>
              <div className="flex h-full flex-col border border-ink/10 bg-paper p-8">
                <h2 className="text-2xl">{tier.name}</h2>
                <p className="mt-3 flex-1 text-sm text-graphite">{tier.description}</p>

                <dl className="mt-6 space-y-2 border-t border-ink/10 pt-6 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-graphite">Duration</dt>
                    <dd className="font-medium">{tier.durationMinutes} min</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-graphite">Level</dt>
                    <dd className="font-medium capitalize">{tier.level}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-graphite">Group size</dt>
                    <dd className="font-medium">Up to {tier.maxSeatsDefault}</dd>
                  </div>
                </dl>

                <p className="mt-6 font-display text-3xl">
                  {formatCents(tier.priceCents, tier.currency.toUpperCase())}
                </p>
                <p className="text-xs text-graphite">GST inclusive</p>

                <Link
                  href="/booking"
                  className="mt-6 block bg-ink px-6 py-4 text-center font-display text-sm uppercase tracking-wide text-paper transition-colors hover:bg-blood"
                >
                  Book Now
                </Link>
              </div>
            </BlurFade>
          ))}
        </div>
      </section>

      <section className="border-t border-ink/10 bg-cloud py-16 md:py-24">
        <div className="container-x max-w-3xl">
          <div className="mb-10 flex items-center gap-3">
            <XMark className="h-5 w-5" color="red" />
            <p className="font-display text-sm uppercase tracking-widest text-blood">
              The Curriculum
            </p>
          </div>
          <h2 className="text-3xl md:text-4xl">Five modules. Every fundamental covered.</h2>
          <p className="mt-4 text-graphite">
            This is what every group class and the Club-Ready Program is built on. Equipment
            taught is Pioneer — the skills transfer to any brand.
          </p>
          <div className="mt-10">
            <Accordion items={modules} />
          </div>
        </div>
      </section>
    </div>
  );
}
