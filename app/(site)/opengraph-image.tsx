import { renderOgImage, ogSize, ogContentType } from "@/lib/og-image";

export const size = ogSize;
export const contentType = ogContentType;
export const alt = "Josh James DJ Academy — Bedroom to Booth";

export default function Image() {
  return renderOgImage("Bedroom to Booth");
}
