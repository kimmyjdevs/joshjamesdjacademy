import { renderOgImage, ogSize, ogContentType } from "@/lib/og-image";

export const size = ogSize;
export const contentType = ogContentType;
export const alt = "About Josh James — DJ Academy Brisbane";

export default function Image() {
  return renderOgImage("17+ Years In The Industry");
}
