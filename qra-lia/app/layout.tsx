// Project scaffolding (normally set up by Moncef) — included here only so
// this package runs standalone before it's merged into the real repo.
// If Moncef's real layout.tsx already defines --font-qra a different way
// (e.g. a different Google Font), keep his version and drop this one —
// this is just a working placeholder so `npm run dev` has a font to use.

import type { Metadata, Viewport } from "next";
import { Noto_Kufi_Arabic } from "next/font/google";
import "./globals.css";

const qraFont = Noto_Kufi_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-qra",
});

export const metadata: Metadata = {
  title: "اقرا ليا · Qra Lia",
  description: "كنقراو ليك الأوراق ديالك بالدارجة",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f4ef" },
    { media: "(prefers-color-scheme: dark)", color: "#14171a" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className={qraFont.variable}>
      <body>{children}</body>
    </html>
  );
}
