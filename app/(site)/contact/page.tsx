import type { Metadata } from "next";
import { ContactForm } from "@/components/contact-form";
import { Accordion } from "@/components/accordion";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with Josh James DJ Academy in Brisbane. Ask about classes, gear, or availability.",
  alternates: { canonical: "/contact" },
};

const faqs = [
  {
    question: "Do I need my own equipment?",
    answer:
      "No. Every class runs on our own gear. If you've already got a controller or turntables at home, bring questions about it — Josh will help you get more out of it.",
  },
  {
    question: "What gear do you teach on?",
    answer:
      "Pioneer — industry standard for club setups. Every skill you learn transfers directly to any other brand or model of mixer, player, or controller.",
  },
  {
    question: "Where are classes held?",
    answer:
      "Fortitude Valley, Brisbane. Exact studio address is sent with your booking confirmation once you've secured a seat.",
  },
  {
    question: "What if I need to cancel or reschedule?",
    answer:
      "Give us 48 hours' notice and we'll move you to another session at no cost. Inside 48 hours, seats aren't refundable — we lock in gear and group sizes ahead of each class, so late cancellations cost us the seat too.",
  },
];

export default function ContactPage() {
  return (
    <div className="container-x py-16 md:py-24">
      <div className="grid gap-16 lg:grid-cols-2">
        <div>
          <p className="mb-3 font-display text-sm uppercase tracking-widest text-blood">Contact</p>
          <h1 className="text-4xl md:text-5xl">Got a question first? Ask away.</h1>
          <p className="mt-4 max-w-md text-graphite">
            For bookings, head straight to the booking page — it&apos;s faster than email. For
            everything else, drop a message below.
          </p>

          <div className="mt-8 space-y-2 text-sm">
            <p>
              <a href={`mailto:${siteConfig.email}`} className="font-medium underline underline-offset-4 hover:text-blood">
                {siteConfig.email}
              </a>
            </p>
            <p>
              <a
                href={siteConfig.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium underline underline-offset-4 hover:text-blood"
              >
                {siteConfig.instagramHandle}
              </a>
            </p>
          </div>

          <div className="mt-12">
            <ContactForm />
          </div>
        </div>

        <div>
          <h2 className="mb-6 font-display text-lg uppercase">FAQ</h2>
          <Accordion items={faqs} />
        </div>
      </div>
    </div>
  );
}
