import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { NumberTicker } from "@/components/magicui/number-ticker";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import { Marquee } from "@/components/magicui/marquee";
import { BlurFade } from "@/components/magicui/blur-fade";
import { XMark } from "@/components/x-mark";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "DJ Lessons Brisbane — Bedroom to Booth",
  description:
    "Learn to DJ properly with Josh James — 17+ years in the industry. Group classes, 1-on-1 coaching, and a Club-Ready Program in Brisbane. Book your seat today.",
  alternates: { canonical: "/" },
};

const audiences = [
  {
    title: "The Bedroom DJ",
    body: "You can mix at home with the lights off and no one watching. The second there's a crowd, you freeze.",
    outcome: "Josh gets you gig-ready by making you practise in front of people before it counts.",
  },
  {
    title: "The Total Beginner",
    body: "You got the controller. It's been sitting there. You genuinely don't know where to start.",
    outcome: "Josh starts you at signal flow and gain — the stuff nobody explains properly — and builds up from there.",
  },
  {
    title: "The Gig Chaser",
    body: "You've mixed for years and maybe played a house party or two. You want to get paid.",
    outcome: "Josh sharpens your transitions, your reads, and your set-building until you're club-ready.",
  },
];

const curriculum = [
  "Equipment & Signal Flow",
  "Beat Matching",
  "Music Structure & Phrasing",
  "EQ & Frequency Mixing",
  "Transitions & Effects",
  "Reading the Room & Energy",
];

const testimonials = [
  {
    quote: "Six weeks ago I didn't know what gain meant. Now I've played my first paid set. Josh doesn't sugarcoat it — he just gets you there.",
    name: "Callum R.",
  },
  {
    quote: "I'd been mixing at home for two years and had no idea how bad my transitions actually were. This course fixed things I didn't know were broken.",
    name: "Priya N.",
  },
  {
    quote: "Straight-up, no-fluff teaching. Josh explains the why behind everything, not just which button to press.",
    name: "Tane W.",
  },
  {
    quote: "Best money I've spent on this hobby. Left the first class already mixing cleaner than I had in a year of YouTube tutorials.",
    name: "Ruby C.",
  },
];

export default function HomePage() {
  return (
    <div>
      <section className="container-x flex flex-col items-center py-20 text-center md:py-32">
        <div className="relative h-16 w-64 md:h-20 md:w-80">
          <Image src="/logo-full.png" alt="Josh James DJ Academy" fill className="object-contain" priority />
        </div>
        <h1 className="mt-10 max-w-3xl text-5xl leading-[0.95] md:text-7xl">
          Bedroom to Booth.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-graphite">
          DJ training that gets you club-ready. Learn the craft from a DJ with 17 years behind the
          decks.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <ShimmerButton href="/booking">Book a Class</ShimmerButton>
          <Link href="/services" className="text-sm font-medium text-ink underline underline-offset-4 hover:text-blood">
            See how it works
          </Link>
        </div>
      </section>

      <section className="border-y border-ink/10 bg-cloud py-14">
        <div className="container-x grid grid-cols-2 gap-8 text-center md:grid-cols-4">
          <Stat value={17} suffix="+" label="Years in the industry" />
          <Stat value={15} label="Years DJing" />
          <Stat value={5} label="Years as Music Director" />
          <Stat value={8} label="Years in AV production" />
        </div>
      </section>

      <section className="container-x py-20 md:py-28">
        <BlurFade>
          <p className="mb-3 font-display text-sm uppercase tracking-widest text-blood">
            Who This Is For
          </p>
          <h2 className="max-w-xl text-3xl md:text-4xl">Wherever you&apos;re starting from, there&apos;s a way in.</h2>
        </BlurFade>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {audiences.map((a, i) => (
            <BlurFade key={a.title} delay={i * 0.1}>
              <div className="flex h-full flex-col border border-ink/10 bg-paper p-8">
                <h3 className="text-xl">{a.title}</h3>
                <p className="mt-4 flex-1 text-sm text-graphite">{a.body}</p>
                <div className="mt-6 flex gap-3 border-t border-ink/10 pt-6">
                  <XMark className="mt-0.5 h-4 w-4 shrink-0" color="red" />
                  <p className="text-sm font-medium">{a.outcome}</p>
                </div>
              </div>
            </BlurFade>
          ))}
        </div>
      </section>

      <section className="bg-ink py-20 text-paper md:py-28">
        <div className="container-x">
          <BlurFade>
            <p className="mb-3 font-display text-sm uppercase tracking-widest text-blood">
              What You&apos;ll Learn
            </p>
            <h2 className="max-w-xl text-3xl md:text-4xl">The fundamentals, taught properly.</h2>
          </BlurFade>
          <ul className="mt-12 grid gap-x-8 gap-y-6 sm:grid-cols-2">
            {curriculum.map((item, i) => (
              <BlurFade key={item} delay={i * 0.05}>
                <li className="flex items-center gap-4 border-b border-paper/10 pb-6">
                  <XMark className="h-5 w-5 shrink-0" color="red" />
                  <span className="font-display text-lg uppercase tracking-tight">{item}</span>
                </li>
              </BlurFade>
            ))}
          </ul>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="container-x">
          <p className="mb-3 text-center font-display text-sm uppercase tracking-widest text-blood">
            From The Students
          </p>
          <h2 className="text-center text-3xl md:text-4xl">Don&apos;t take our word for it.</h2>
        </div>

        <div className="mt-12">
          <Marquee>
            {testimonials.map((t) => (
              <div key={t.name} className="mx-4 w-80 shrink-0 border border-ink/10 bg-cloud p-6">
                <p className="text-sm leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
                <p className="mt-4 font-display text-xs uppercase tracking-wide text-blood">
                  {t.name}
                </p>
              </div>
            ))}
          </Marquee>
        </div>
      </section>

      <section className="border-t border-ink/10 bg-cloud py-20 text-center md:py-28">
        <div className="container-x">
          <h2 className="mx-auto max-w-2xl text-4xl md:text-5xl">
            Stop practising in the dark. Get in the room.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-graphite">
            Seats are limited per session. Book yours before it fills.
          </p>
          <div className="mt-10 flex justify-center">
            <ShimmerButton href="/booking">Book a Class</ShimmerButton>
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({ value, suffix = "", label }: { value: number; suffix?: string; label: string }) {
  return (
    <div>
      <p className="font-display text-4xl md:text-5xl">
        <NumberTicker value={value} suffix={suffix} />
      </p>
      <p className="mt-2 text-xs uppercase tracking-wide text-graphite">{label}</p>
    </div>
  );
}
