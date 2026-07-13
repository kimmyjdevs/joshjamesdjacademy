import { renderOgImage, ogSize, ogContentType } from "@/lib/og-image";

export const size = ogSize;
export const contentType = ogContentType;
export const alt = "Josh James DJ Academy — Classes & Coaching";

export default function Image() {
  return renderOgImage("Classes, Coaching & The Club-Ready Program");
}
