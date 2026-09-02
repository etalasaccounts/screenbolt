import type { Metadata, Viewport } from "next";
import { Inter_Tight, Instrument_Serif } from "next/font/google";
import { RecordingProvider } from "@/components/record/recording-provider";
import Script from "next/script";
import "./globals.css";

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: "400",
});

export const viewport: Viewport = {
  // Colors the mobile browser chrome; matches the app background + manifest theme_color.
  themeColor: "#f5f5f2",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://screenbolt.com"),
  applicationName: "Screenbolt",
  title: {
    default: "Screenbolt — Free Screen Recorder & Instant Video Sharing",
    template: "%s — Screenbolt",
  },
  // Brand attribution — a real link to etalas.com does more for the
  // Screenbolt↔Etalas association than any keyword ever could.
  authors: [{ name: "Etalas", url: "https://etalas.com" }],
  creator: "Etalas",
  publisher: "Etalas",
  category: "technology",
  // Marketing copy, not a phone book — stop iOS from linkifying numbers.
  formatDetection: { telephone: false, email: false, address: false },
  // Let Google index freely and show the richest snippet/preview it can.
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  description:
    "A free screen recorder and Loom alternative to capture your screen and share it instantly — record HD videos, share a link, no download.",
  keywords: [
    // Brand — Screenbolt & Etalas
    "Screenbolt",
    "screenbolt.com",
    "Screenbolt Etalas",
    "Etalas",
    "Etalas.com",
    "produk Etalas",
    "aplikasi Etalas",
    // Core — English
    "screen recorder",
    "screen recording",
    "online screen recorder",
    "free screen recorder",
    "record screen online",
    "screen recorder no download",
    "browser screen recorder",
    "screen capture",
    "HD screen recorder",
    "share screen recording",
    "record screen and share link",
    "screen video sharing",
    "screencast",
    "async video",
    "video messaging",
    // Core — Bahasa Indonesia
    "screen record indonesia",
    "screen recorder indonesia",
    "perekam layar",
    "perekam layar gratis",
    "perekam layar online",
    "aplikasi perekam layar",
    "aplikasi rekam layar",
    "rekam layar",
    "rekam layar online",
    "rekam layar laptop",
    "rekam layar pc",
    "rekam layar tanpa aplikasi",
    "cara merekam layar",
    "perekam layar HD",
    "perekam layar browser",
    "bagikan rekaman layar",
    "aplikasi perekam layar terbaik",
  ],
  openGraph: {
    type: "website",
    siteName: "Screenbolt",
    title: "Screenbolt — Free Screen Recorder & Instant Video Sharing",
    description:
      "Capture your screen and share it in seconds. Screenbolt is the fastest free screen recorder for instant HD video sharing — no download required.",
    url: "https://screenbolt.com",
    locale: "en_US",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1536,
        height: 1024,
        alt: "Screenbolt — Free screen recorder for instant HD video sharing",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Screenbolt — Free Screen Recorder & Instant Video Sharing",
    description:
      "Capture your screen and share it in seconds. The fastest free screen recorder for instant HD video sharing — no download required.",
    images: ["/opengraph-image.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${interTight.variable} ${instrumentSerif.variable} antialiased`}
    >
      <body className="bg-[#f5f5f2] text-[#090b0c]">
        <RecordingProvider>{children}</RecordingProvider>
        <Script
          defer
          src="https://cloud.umami.is/script.js"
          data-website-id="fae5d93f-d673-44ae-8cfe-a77ce20332d4"
        />
      </body>
    </html>
  );
}
