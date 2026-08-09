import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `Terms and conditions for using ${siteConfig.name}'s website and booking classes.`,
  alternates: { canonical: "/terms" },
  robots: { index: false, follow: true },
};

export default function TermsPage() {
  return (
    <div className="container-x max-w-3xl py-16 md:py-24">
      <p className="mb-3 font-display text-sm uppercase tracking-widest text-blood">Legal</p>
      <h1 className="text-4xl md:text-5xl">Terms of Service</h1>
      <p className="mt-4 text-sm text-graphite">Last updated: {new Date().toLocaleDateString("en-AU")}</p>

      <div className="mt-10 space-y-8 text-sm leading-relaxed text-graphite">
        <section>
          <h2 className="text-lg text-ink">1. About these terms</h2>
          <p className="mt-2">
            These terms govern your use of {siteConfig.url} and any class you book through it, operated by{" "}
            {siteConfig.name} (ABN {siteConfig.abn}). By booking a class, you agree to these terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg text-ink">2. Bookings and payment</h2>
          <p className="mt-2">
            Seats are booked and paid for online through Stripe at the time of booking. A seat is only
            confirmed once payment has been successfully processed. Prices are shown in AUD and include GST
            where applicable.
          </p>
        </section>

        <section>
          <h2 className="text-lg text-ink">3. Cancellations and refunds</h2>
          <p className="mt-2">
            See our{" "}
            <Link href="/refund-policy" className="underline underline-offset-4 hover:text-blood">
              Refund Policy
            </Link>{" "}
            for full details on cancellations, rescheduling, and refunds.
          </p>
        </section>

        <section>
          <h2 className="text-lg text-ink">4. Equipment and studio conduct</h2>
          <p className="mt-2">
            Classes run on our equipment at our studio in Fortitude Valley, Brisbane. You agree to follow
            reasonable instruction from your trainer and to treat the studio and equipment with care. We
            reserve the right to remove anyone from a session for unsafe or disruptive conduct without a
            refund.
          </p>
        </section>

        <section>
          <h2 className="text-lg text-ink">5. No guarantee of outcome</h2>
          <p className="mt-2">
            Classes are designed to build real DJ skills, but we don&apos;t guarantee specific outcomes (such
            as paid gigs or bookings) as a result of completing any class or program.
          </p>
        </section>

        <section>
          <h2 className="text-lg text-ink">6. Limitation of liability</h2>
          <p className="mt-2">
            To the maximum extent permitted by law, {siteConfig.name} is not liable for any indirect or
            consequential loss arising from your use of this website or attendance at a class. Nothing in
            these terms excludes any consumer guarantee that cannot lawfully be excluded under the Australian
            Consumer Law.
          </p>
        </section>

        <section>
          <h2 className="text-lg text-ink">7. Governing law</h2>
          <p className="mt-2">
            These terms are governed by the laws of Queensland, Australia.
          </p>
        </section>

        <section>
          <h2 className="text-lg text-ink">8. Contact</h2>
          <p className="mt-2">
            Questions about these terms can be sent to{" "}
            <a href={`mailto:${siteConfig.email}`} className="underline underline-offset-4 hover:text-blood">
              {siteConfig.email}
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
