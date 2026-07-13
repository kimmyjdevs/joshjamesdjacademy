import { cn } from "@/lib/utils";

export function XMark({
  className,
  color = "black",
}: {
  className?: string;
  color?: "black" | "red";
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn("h-4 w-4 shrink-0", className)}
      aria-hidden="true"
    >
      <path
        d="M4 4.5C7.5 8.5 9 10.5 12 14.5C15.5 10 17.5 7.5 20 4"
        stroke={color === "red" ? "#6E1414" : "#0A0A0A"}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M20.5 5C16.5 8.8 14.5 11 11.5 15C8.5 18.5 6.5 20 4 21.5"
        stroke={color === "red" ? "#6E1414" : "#0A0A0A"}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
