import { renderOgImage, ogSize, ogContentType } from "@/lib/og-image";

export const size = ogSize;
export const contentType = ogContentType;
export const alt = "Book a DJ Class — Josh James DJ Academy";

export default function Image() {
  return renderOgImage("Book Your Seat — Brisbane");
}
