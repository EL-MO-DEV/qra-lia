import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";

// One family for both scripts: Darija (Arabic script) + French subtitles (Latin).
// System fallbacks cover iOS (Geeza Pro), Android (Noto) and Windows (Segoe UI / Tahoma).
const qraFont = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-qra",
  fallback: [
    "system-ui",
    "-apple-system",
    "Segoe UI",
    "Geeza Pro",
    "Noto Sans Arabic",
    "Noto Naskh Arabic",
    "Tahoma",
    "Arial",
    "sans-serif",
  ],
});

export const metadata: Metadata = {
  title: "Qra Lia — اقرا ليا",
  description:
    "صوّر أي ورقة ونشرحها ليك بالدارجة · Photographiez un document, on vous l'explique en darija.",
  applicationName: "Qra Lia",
};

// No maximumScale / userScalable: elderly users must be able to zoom.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${qraFont.variable} h-full antialiased`}
    >
      <body className={`${qraFont.className} min-h-full flex flex-col`}>
        {children}
      </body>
    </html>
  );
}
