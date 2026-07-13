import Link from "next/link";
import Image from "next/image";
import { navLinks } from "@/lib/site";
import { MobileNav } from "@/components/mobile-nav";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-ink/10 bg-paper/95 backdrop-blur">
      <div className="container-x flex h-20 items-center justify-between">
        <Link href="/" className="relative h-10 w-40 shrink-0" aria-label="Josh James DJ Academy — home">
          <Image
            src="/logo-full.png"
            alt="Josh James DJ Academy"
            fill
            className="object-contain object-left"
            priority
          />
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {navLinks
            .filter((l) => l.href !== "/booking")
            .map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-display text-sm uppercase tracking-wide text-ink transition-colors hover:text-blood"
              >
                {link.label}
              </Link>
            ))}
          <Link
            href="/booking"
            className="bg-ink px-6 py-3 font-display text-sm uppercase tracking-wide text-paper transition-colors hover:bg-blood"
          >
            Book a Class
          </Link>
        </nav>

        <MobileNav />
      </div>
    </header>
  );
}
