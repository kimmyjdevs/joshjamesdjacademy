import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";

export const metadata: Metadata = {
  title: "Admin Login",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen flex-1 flex-col items-center justify-center bg-cloud px-4 py-16">
      <div className="mb-8 text-center">
        <p className="font-display text-sm uppercase tracking-widest text-blood">Admin</p>
        <h1 className="mt-2 text-2xl">Josh James DJ Academy back office</h1>
      </div>
      <SignIn
        routing="hash"
        fallbackRedirectUrl="/admin/sessions"
        appearance={{
          variables: {
            colorPrimary: "#0A0A0A",
            colorText: "#0A0A0A",
            colorBackground: "#FFFFFF",
            borderRadius: "0px",
          },
          elements: {
            card: "shadow-none border border-black/10",
            footerActionLink: "text-[#6E1414] hover:text-[#6E1414]",
            formButtonPrimary:
              "bg-[#0A0A0A] hover:bg-[#6E1414] text-white uppercase tracking-wide text-sm font-bold",
          },
        }}
      />
    </div>
  );
}
