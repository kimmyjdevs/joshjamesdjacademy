import type { Metadata } from "next";
import { SignOutButton } from "@clerk/nextjs";

export const metadata: Metadata = {
  title: "Not Authorised",
  robots: { index: false, follow: false },
};

export default function NotAuthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cloud px-4 py-16 text-center">
      <p className="font-display text-sm uppercase tracking-widest text-blood">Admin</p>
      <h1 className="mt-2 max-w-md text-2xl">This account doesn&apos;t have access to the back office.</h1>
      <p className="mt-4 max-w-sm text-sm text-graphite">
        Only approved accounts can sign in here. If you think this is a mistake, contact Josh James DJ
        Academy directly.
      </p>
      <SignOutButton redirectUrl="/admin/login">
        <button className="mt-8 bg-ink px-6 py-3 font-display text-sm uppercase tracking-wide text-paper hover:bg-blood">
          Sign out and try another account
        </button>
      </SignOutButton>
    </div>
  );
}
