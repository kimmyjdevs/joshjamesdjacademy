import type { Metadata } from "next";
import { ConfirmedStatus } from "@/components/booking/confirmed-status";

export const metadata: Metadata = {
  title: "Booking Confirmed",
  robots: { index: false },
};

export default async function BookingConfirmedPage({
  searchParams,
}: {
  searchParams: { session_id?: string };
}) {
  const checkoutSessionId = searchParams.session_id;

  if (!checkoutSessionId) {
    return (
      <div className="container-x py-24 text-center">
        <h1 className="text-3xl">We couldn&apos;t find that booking.</h1>
        <p className="mt-4 text-graphite">
          If you just paid, check your email for confirmation. Otherwise head back and grab a
          session.
        </p>
      </div>
    );
  }

  return (
    <div className="container-x py-16 md:py-24">
      <ConfirmedStatus checkoutSessionId={checkoutSessionId} />
    </div>
  );
}
