import type { Metadata } from "next";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy",
  description: `Cancellation, rescheduling, and refund terms for ${siteConfig.name} classes.`,
  alternates: { canonical: "/refund-policy" },
  robots: { index: false, follow: true },
};

export default function RefundPolicyPage() {
  return (
    <div className="container-x max-w-3xl py-16 md:py-24">
      <p className="mb-3 font-display text-sm uppercase tracking-widest text-blood">Legal</p>
      <h1 className="text-4xl md:text-5xl">Refund & Cancellation Policy</h1>
      <p className="mt-4 text-sm text-graphite">Last updated: {new Date().toLocaleDateString("en-AU")}</p>

      <div className="mt-10 space-y-8 text-sm leading-relaxed text-graphite">
        <section>
          <h2 className="text-lg text-ink">If you need to cancel or reschedule</h2>
          <p className="mt-2">
            Give us at least <strong>48 hours&apos; notice</strong> before your session and we&apos;ll move you
            to another available session at no extra cost.
          </p>
          <p className="mt-2">
            Inside 48 hours of your session, seats are non-refundable. We lock in equipment and group sizes
            ahead of each class, so a late cancellation costs us the seat too.
          </p>
        </section>

        <section>
          <h2 className="text-lg text-ink">If we cancel a session</h2>
          <p className="mt-2">
            If {siteConfig.name} cancels a scheduled session for any reason, everyone with a confirmed,
            paid booking on that session is automatically refunded in full to their original payment method.
            No action is required on your part.
          </p>
        </section>

        <section>
          <h2 className="text-lg text-ink">How refunds are processed</h2>
          <p className="mt-2">
            Refunds are issued through Stripe back to the card used for the original payment. Depending on
            your bank, refunds can take 5–10 business days to appear on your statement.
          </p>
        </section>

        <section>
          <h2 className="text-lg text-ink">Questions</h2>
          <p className="mt-2">
            If something about your booking doesn&apos;t look right, email{" "}
            <a href={`mailto:${siteConfig.email}`} className="underline underline-offset-4 hover:text-blood">
              {siteConfig.email}
            </a>{" "}
            and we&apos;ll sort it out.
          </p>
        </section>
      </div>
    </div>
  );
}
