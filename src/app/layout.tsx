import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
/* The two tiers this package produced from Noto Sans JP. The page is set in
   them, so the demo is the page itself rather than a picture of one. */
import "./demo-font.css";
import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

/* The heading face. Packages sharing one face are hard to tell apart. */
const display = Fraunces({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["700"],
});

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  applicationName: "unicode-range-split",
  description:
    "Split a font into a common tier and a rare tier with unicode-range. No glyph is dropped: ordinary pages fetch the small file, and the rest waits until a page needs it.",
  formatDetection: { telephone: false },
  metadataBase: new URL("https://unicode-range-split.kkweb.io"),
  title: "unicode-range-split - Ship the Font Twice, Fetch It Once",
};

export const viewport: Viewport = {
  themeColor: "#0b100f",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${display.variable} antialiased`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
