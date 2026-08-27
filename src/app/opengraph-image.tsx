import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import demoFont from "./demo-font.json";

export const alt = "unicode-range-split";

export const size = { height: 630, width: 1200 };

export const contentType = "image/png";

const TITLE = "Ship the font twice.";
const SUBTITLE = "Fetch it once.";

function kib(bytes: number): string {
  return `${(bytes / 1024).toFixed(0)} KiB`;
}

function mib(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MiB`;
}

export default async function Image() {
  /* The same Fraunces the site uses for headings, cut down to Latin. Change the
     copy and rebuild it per assets/README.md. */
  const font = await readFile(
    join(process.cwd(), "assets/Fraunces-700-subset.ttf"),
  );
  const { common, rest, source } = demoFont;
  /* The card carries the same figures the page does, from the same build. */
  const bars = [
    { color: "#3f3f46", label: `whole font  ${mib(source.bytes)}`, width: 560 },
    {
      color: "#34d399",
      label: `common tier  ${kib(common.bytes)}`,
      width: Math.max((common.bytes / source.bytes) * 560, 14),
    },
    {
      color: "#fbbf24",
      label: `rare tier  ${mib(rest.bytes)}`,
      width: (rest.bytes / source.bytes) * 560,
    },
  ];

  return new ImageResponse(
    <div
      style={{
        background: "#0b100f",
        color: "#ffffff",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        justifyContent: "center",
        padding: "0 80px",
        width: "100%",
      }}
    >
      <div
        style={{
          color: "#34d399",
          display: "flex",
          fontSize: 26,
          letterSpacing: 4,
        }}
      >
        UNICODE-RANGE-SPLIT
      </div>
      <div style={{ display: "flex", fontSize: 72, marginTop: 26 }}>
        {TITLE}
      </div>
      <div style={{ color: "#a1a1aa", display: "flex", fontSize: 72 }}>
        {SUBTITLE}
      </div>

      {/* The three files, to scale. A name and a line of copy alone would make
          every card look the same. */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 18,
          marginTop: 54,
        }}
      >
        {bars.map((bar) => (
          <div
            key={bar.label}
            style={{ alignItems: "center", display: "flex", gap: 24 }}
          >
            <div
              style={{
                background: bar.color,
                borderRadius: 8,
                display: "flex",
                height: 16,
                width: bar.width,
              }}
            />
            <div style={{ color: "#71717a", display: "flex", fontSize: 24 }}>
              {bar.label}
            </div>
          </div>
        ))}
      </div>
    </div>,
    {
      ...size,
      fonts: [{ data: font, name: "Fraunces", style: "normal", weight: 700 }],
    },
  );
}
