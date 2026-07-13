import { ButtonHTMLAttributes, forwardRef } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface ShimmerButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  href?: string;
}

export const ShimmerButton = forwardRef<HTMLButtonElement, ShimmerButtonProps>(
  ({ className, children, href, ...props }, ref) => {
    const classes = cn(
      "group relative inline-flex items-center justify-center overflow-hidden",
      "bg-ink text-paper px-8 py-4 font-display uppercase tracking-wide text-sm",
      "transition-colors hover:bg-blood focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blood",
      className,
    );

    const shimmer = (
      <span
        className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.25),transparent)] bg-[length:200%_100%] animate-shimmer"
        aria-hidden="true"
      />
    );

    if (href) {
      return (
        <Link href={href} className={classes}>
          <span className="relative z-10">{children}</span>
          {shimmer}
        </Link>
      );
    }

    return (
      <button ref={ref} className={classes} {...props}>
        <span className="relative z-10">{children}</span>
        {shimmer}
      </button>
    );
  },
);
ShimmerButton.displayName = "ShimmerButton";
