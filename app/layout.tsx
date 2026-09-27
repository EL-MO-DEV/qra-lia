import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import { LangProvider } from "@/lib/i18n";
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

const DESCRIPTION =
  "صوّر أي ورقة ونشرحها ليك بالدارجة، بالكتابة وبالصوت · Photographiez un document, on vous l'explique en darija.";

export const metadata: Metadata = {
  metadataBase: new URL("https://qra-lia.vercel.app"),
  title: "Qra Lia — اقرا ليا",
  description: DESCRIPTION,
  applicationName: "Qra Lia",
  // Link previews when the app is shared on WhatsApp / social networks.
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Qra Lia",
    title: "Qra Lia — اقرا ليا · AI that reads your paperwork to you in Darija",
    description: DESCRIPTION,
    locale: "ar_MA",
  },
  twitter: { card: "summary", title: "Qra Lia — اقرا ليا", description: DESCRIPTION },
  appleWebApp: { capable: true, title: "Qra Lia", statusBarStyle: "default" },
  // Don't turn numbers on papers (contract numbers, amounts) into tappable phone links.
  formatDetection: { telephone: false },
};

// No maximumScale / userScalable: elderly users must be able to zoom.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f1e7" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1412" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${qraFont.variable} h-full antialiased`}
    >
      <body className={`${qraFont.className} min-h-full flex flex-col`}>
        <LangProvider>{children}</LangProvider>
      </body>
    </html>
  );
}
