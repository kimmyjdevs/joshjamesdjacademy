import type { Metadata } from "next";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// Admin pages hit the DB with live data on every request via Clerk-gated
// access — never statically prerender them at build time.
export const dynamic = "force-dynamic";

const links = [
  { href: "/admin/sessions", label: "Sessions" },
  { href: "/admin/class-types", label: "Class Types" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/enquiries", label: "Enquiries" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cloud">
      <div className="border-b border-ink/10 bg-ink text-paper">
        <div className="container-x flex h-16 items-center justify-between">
          <p className="font-display text-sm uppercase tracking-wide">JJ Admin</p>
          <nav className="flex items-center gap-6 overflow-x-auto" aria-label="Admin">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="whitespace-nowrap text-sm text-paper/80 transition-colors hover:text-blood"
              >
                {l.label}
              </Link>
            ))}
            <UserButton afterSignOutUrl="/admin/login" />
          </nav>
        </div>
      </div>
      <div className="container-x py-10">{children}</div>
    </div>
  );
}
