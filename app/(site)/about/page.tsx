import type { Metadata } from "next";
import Image from "next/image";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import { BlurFade } from "@/components/magicui/blur-fade";
import { XMark } from "@/components/x-mark";

export const metadata: Metadata = {
  title: "About Josh",
  description:
    "17+ years in music and entertainment. 15 as a DJ, 5 as a Music Director, 8 in audio-visual production. Meet the Brisbane DJ trainer behind Josh James DJ Academy.",
  alternates: { canonical: "/about" },
};

const principles = [
  {
    title: "Knowledge is the craft",
    body: "Pride yourself on knowledge. The more you know about your gear and your music inside and out, the more it makes you not just good — it makes you a master.",
  },
  {
    title: "Make two songs sound like one",
    body: "Mixing is timing and energy transfer. Every technique we teach exists to serve that one goal — seamless, smooth, almost inaudible to the listener.",
  },
  {
    title: "Be resourceful",
    body: "One of the best skills you can develop is figuring things out yourself. We teach broad, transferable fundamentals — not just which button to press on one machine.",
  },
];

export default function AboutPage() {
  return (
    <div>
      <section className="container-x py-16 md:py-24">
        <BlurFade>
          <p className="mb-3 font-display text-sm uppercase tracking-widest text-blood">About</p>
          <h1 className="max-w-2xl text-4xl md:text-5xl">
            Melbourne-raised. Brisbane-based. 17 years behind the decks and counting.
          </h1>
        </BlurFade>
      </section>

      <div className="relative h-[50vh] w-full md:h-[60vh]">
        <Image
          src="/images/gear-mixer-moody.jpg"
          alt="Hands on a Pioneer DJ mixer, mid-transition"
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
      </div>

      <section className="container-x py-16 md:py-24">
        <div className="grid gap-12 md:grid-cols-2">
          <BlurFade>
            <div className="max-w-lg space-y-5 text-graphite">
              <p>
                Josh James is a dedicated professional with over 17 years of domestic and
                international experience in the music and entertainment industries — 15 years as
                a DJ, 5 years as a Music Director, and 8 years in audio-visual production.
              </p>
              <p>
                He&apos;s crafted dynamic soundscapes for bars, clubs, and festivals worldwide,
                specialising in music curation, event production, and audio production. That
                run — DJ, then Music Director, then educator — is exactly why the academy
                exists: Josh has sat on both sides of the booth, running the room and training
                the people who run it.
              </p>
              <p>
                Now based in Brisbane, Josh takes that same hands-on, technically thorough
                approach and puts it to work getting beginner and bedroom DJs ready for real
                gigs — not just ready to mix at home with the lights off.
              </p>
            </div>
          </BlurFade>

          <BlurFade delay={0.1}>
            <div className="space-y-6">
              {principles.map((p) => (
                <div key={p.title} className="flex gap-4 border-l-2 border-blood pl-6">
                  <div>
                    <h2 className="text-lg">{p.title}</h2>
                    <p className="mt-2 text-sm text-graphite">{p.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </BlurFade>
        </div>
      </section>

      <section className="border-t border-ink/10">
        <div className="relative h-[40vh] w-full md:h-[50vh]">
          <Image
            src="/images/teaching-hands.jpg"
            alt="Josh working the decks side by side with a student"
            fill
            className="object-cover"
            sizes="100vw"
          />
        </div>
      </section>

      <section className="border-t border-ink/10 bg-cloud py-20 text-center">
        <div className="container-x">
          <XMark className="mx-auto mb-6 h-6 w-6" color="red" />
          <h2 className="mx-auto max-w-xl text-3xl md:text-4xl">
            See exactly what&apos;s covered in every class.
          </h2>
          <div className="mt-8 flex justify-center">
            <ShimmerButton href="/services">View Services</ShimmerButton>
          </div>
        </div>
      </section>
    </div>
  );
}
