import { renderOgImage, ogSize, ogContentType } from "@/lib/og-image";

export const size = ogSize;
export const contentType = ogContentType;
export const alt = "Contact Josh James DJ Academy";

export default function Image() {
  return renderOgImage("Get In Touch");
}
