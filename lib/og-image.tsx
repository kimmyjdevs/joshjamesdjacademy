import { ImageResponse } from "next/og";

export const ogSize = { width: 1200, height: 630 };
export const ogContentType = "image/png";

export function renderOgImage(subtitle: string) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#FFFFFF",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <XGlyph />
          <XGlyph small />
          <div
            style={{
              fontSize: 96,
              fontWeight: 900,
              color: "#0A0A0A",
              letterSpacing: -2,
              fontFamily: "sans-serif",
              textTransform: "uppercase",
            }}
          >
            Josh James
          </div>
          <XGlyph small color="#6E1414" />
          <XGlyph color="#6E1414" />
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 34,
            color: "#737373",
            fontFamily: "sans-serif",
            textTransform: "uppercase",
            letterSpacing: 4,
          }}
        >
          {subtitle}
        </div>
      </div>
    ),
    { ...ogSize },
  );
}

function XGlyph({ small = false, color = "#0A0A0A" }: { small?: boolean; color?: string }) {
  const s = small ? 40 : 56;
  const barHeight = Math.round(s * 0.16);
  const barWidth = Math.round(s * 1.15);
  return (
    <div
      style={{
        display: "flex",
        width: s,
        height: s,
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: s / 2 - barHeight / 2,
          left: s / 2 - barWidth / 2,
          width: barWidth,
          height: barHeight,
          backgroundColor: color,
          borderRadius: barHeight / 2,
          transform: "rotate(45deg)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: s / 2 - barHeight / 2,
          left: s / 2 - barWidth / 2,
          width: barWidth,
          height: barHeight,
          backgroundColor: color,
          borderRadius: barHeight / 2,
          transform: "rotate(-45deg)",
        }}
      />
    </div>
  );
}
