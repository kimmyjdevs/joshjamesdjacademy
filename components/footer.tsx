import Link from "next/link";
import Image from "next/image";
import { navLinks, siteConfig } from "@/lib/site";
import { XMark } from "@/components/x-mark";

export function Footer() {
  return (
    <footer className="border-t border-paper/10 bg-ink text-paper">
      <div className="container-x grid gap-12 py-16 md:grid-cols-3">
        <div>
          <div className="relative h-9 w-36">
            <Image
              src="/logo-full.png"
              alt="Josh James DJ Academy"
              fill
              className="object-contain object-left invert"
            />
          </div>
          <p className="mt-4 max-w-xs text-sm text-paper/60">
            Brisbane-based DJ training. Bedroom to booth, one class at a time.
          </p>
        </div>

        <div>
          <p className="mb-4 font-display text-sm uppercase tracking-wide text-paper/60">
            Quick Links
          </p>
          <ul className="space-y-3">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-sm transition-colors hover:text-blood">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-4 font-display text-sm uppercase tracking-wide text-paper/60">
            Get In Touch
          </p>
          <ul className="space-y-3 text-sm">
            <li>
              <a href={`mailto:${siteConfig.email}`} className="transition-colors hover:text-blood">
                {siteConfig.email}
              </a>
            </li>
            <li>
              <a
                href={siteConfig.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-blood"
              >
                {siteConfig.instagramHandle}
              </a>
            </li>
            <li className="text-paper/50">{siteConfig.location}</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-paper/10">
        <div className="container-x flex flex-col items-center justify-between gap-4 py-6 text-xs text-paper/40 md:flex-row">
          <p>
            &copy; {new Date().getFullYear()} Josh James DJ Academy. ABN {siteConfig.abn}.
          </p>
          <div className="flex items-center gap-2">
            <XMark className="h-3 w-3" color="red" />
            <span>Made with care in Brisbane.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
