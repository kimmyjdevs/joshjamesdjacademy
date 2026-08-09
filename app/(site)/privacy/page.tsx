import type { Metadata } from "next";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${siteConfig.name} collects, uses, and protects your personal information.`,
  alternates: { canonical: "/privacy" },
  robots: { index: false, follow: true },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="container-x max-w-3xl py-16 md:py-24">
      <p className="mb-3 font-display text-sm uppercase tracking-widest text-blood">Legal</p>
      <h1 className="text-4xl md:text-5xl">Privacy Policy</h1>
      <p className="mt-4 text-sm text-graphite">Last updated: {new Date().toLocaleDateString("en-AU")}</p>

      <div className="mt-10 space-y-8 text-sm leading-relaxed text-graphite">
        <section>
          <h2 className="text-lg text-ink">1. Who we are</h2>
          <p className="mt-2">
            {siteConfig.name} (ABN {siteConfig.abn}) operates this website at {siteConfig.url}. We can be
            contacted at{" "}
            <a href={`mailto:${siteConfig.email}`} className="underline underline-offset-4 hover:text-blood">
              {siteConfig.email}
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-lg text-ink">2. Information we collect</h2>
          <p className="mt-2">When you book a class or contact us, we collect:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Your name, email address, and phone number</li>
            <li>Booking details — class type, session date, and seats booked</li>
            <li>Payment is processed directly by Stripe; we do not store your card details</li>
            <li>Messages you send us through the contact form</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg text-ink">3. How we use your information</h2>
          <p className="mt-2">We use your information to:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Manage your class booking and send confirmation details</li>
            <li>Contact you about a session you&apos;ve booked (changes, cancellations, reminders)</li>
            <li>Respond to enquiries submitted through the contact form</li>
            <li>Meet our legal and accounting obligations</li>
          </ul>
          <p className="mt-2">We do not sell your personal information to third parties.</p>
        </section>

        <section>
          <h2 className="text-lg text-ink">4. Third parties we share data with</h2>
          <p className="mt-2">
            We use trusted third-party services to run this business, each of which processes data under
            their own privacy policy:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong>Stripe</strong> — payment processing
            </li>
            <li>
              <strong>Neon</strong> — database hosting
            </li>
            <li>
              <strong>Clerk</strong> — secure admin login
            </li>
            <li>
              <strong>Netlify</strong> — website hosting
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg text-ink">5. Data retention</h2>
          <p className="mt-2">
            We retain booking records for as long as reasonably necessary for business, tax, and accounting
            purposes. You can request deletion of your personal information at any time, subject to our legal
            record-keeping obligations.
          </p>
        </section>

        <section>
          <h2 className="text-lg text-ink">6. Your rights</h2>
          <p className="mt-2">
            You can request access to, correction of, or deletion of the personal information we hold about
            you by emailing{" "}
            <a href={`mailto:${siteConfig.email}`} className="underline underline-offset-4 hover:text-blood">
              {siteConfig.email}
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-lg text-ink">7. Changes to this policy</h2>
          <p className="mt-2">
            We may update this policy from time to time. Changes will be posted on this page with an updated
            date.
          </p>
        </section>
      </div>
    </div>
  );
}
