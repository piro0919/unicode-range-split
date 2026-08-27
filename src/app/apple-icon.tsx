import { ImageResponse } from "next/og";

export const size = { height: 180, width: 180 };

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: "linear-gradient(135deg, #34d399 0%, #0d9488 100%)",
        display: "flex",
        flexDirection: "column",
        gap: 18,
        height: "100%",
        justifyContent: "center",
        width: "100%",
      }}
    >
      <div
        style={{
          background: "#062018",
          borderRadius: 999,
          height: 20,
          width: 62,
        }}
      />
      <div
        style={{
          border: "6px dashed #062018",
          borderRadius: 999,
          height: 20,
          width: 108,
        }}
      />
    </div>,
    { ...size },
  );
}
