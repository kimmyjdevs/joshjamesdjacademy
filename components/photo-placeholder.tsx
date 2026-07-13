import { XMark } from "@/components/x-mark";
import { cn } from "@/lib/utils";

export function PhotoPlaceholder({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden bg-ink text-paper/40",
        className,
      )}
    >
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 2px, transparent 2px, transparent 14px)",
        }}
        aria-hidden="true"
      />
      <div className="relative flex flex-col items-center gap-3 px-6 text-center">
        <XMark className="h-6 w-6" color="red" />
        <p className="font-display text-xs uppercase tracking-widest">
          TODO: replace with client photography
        </p>
        <p className="max-w-xs text-xs text-paper/50">{label}</p>
      </div>
    </div>
  );
}
