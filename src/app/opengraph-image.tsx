import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import demoFont from "./demo-font.json";

export const alt = "unicode-range-split";

export const size = { height: 630, width: 1200 };

export const contentType = "image/png";

const TITLE = "unicode-range-split";
const DESCRIPTION =
  "Splits a font into a common tier and a rare tier with unicode-range, dropping no glyph.";

const BAR_WIDTH = 320;

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
    {
      color: "#3f3f46",
      label: `whole font  ${mib(source.bytes)}`,
      width: BAR_WIDTH,
    },
    {
      color: "#34d399",
      label: `common tier  ${kib(common.bytes)}`,
      width: Math.max((common.bytes / source.bytes) * BAR_WIDTH, 10),
    },
    {
      color: "#fbbf24",
      label: `rare tier  ${mib(rest.bytes)}`,
      width: (rest.bytes / source.bytes) * BAR_WIDTH,
    },
  ];

  /* Same layout as the other package cards on kkweb.io: name, one line and
     the domain on the left, what the package does on the right. */
  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: "#0b0b0f",
        color: "#ffffff",
        display: "flex",
        height: "100%",
        padding: "0 80px",
        width: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          width: 600,
        }}
      >
        <div style={{ display: "flex", fontSize: 56, letterSpacing: -1 }}>
          {TITLE}
        </div>
        <div
          style={{
            color: "#a1a1aa",
            display: "flex",
            fontSize: 30,
            lineHeight: 1.4,
            marginTop: 28,
          }}
        >
          {DESCRIPTION}
        </div>
        <div
          style={{
            color: "#71717a",
            display: "flex",
            fontSize: 26,
            marginTop: 48,
          }}
        >
          kkweb.io
        </div>
      </div>

      {/* The three files, to scale. */}
      <div
        style={{
          alignItems: "center",
          display: "flex",
          flex: 1,
          justifyContent: "flex-end",
        }}
      >
        <div
          style={{
            background: "#15151c",
            border: "1px solid #26262f",
            borderRadius: 20,
            display: "flex",
            flexDirection: "column",
            gap: 20,
            padding: 28,
          }}
        >
          {bars.map((bar) => (
            <div
              key={bar.label}
              style={{ display: "flex", flexDirection: "column", gap: 8 }}
            >
              <div
                style={{
                  background: bar.color,
                  borderRadius: 6,
                  display: "flex",
                  height: 14,
                  width: bar.width,
                }}
              />
              <div style={{ color: "#a1a1aa", display: "flex", fontSize: 22 }}>
                {bar.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: [{ data: font, name: "Fraunces", style: "normal", weight: 700 }],
    },
  );
}
