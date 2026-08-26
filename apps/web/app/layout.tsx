import type { Metadata } from "next";
import { Inter_Tight, Instrument_Serif } from "next/font/google";
import { RecordingProvider } from "@/components/record/recording-provider";
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

export const metadata: Metadata = {
  metadataBase: new URL("https://screenbolt.com"),
  title: {
    default: "Screenbolt — Free Screen Recorder & Instant Video Sharing",
    template: "%s — Screenbolt",
  },
  description:
    "Screenbolt is a free screen recorder that lets you capture your screen and share it instantly. Record, trim, and send HD screen recordings with a link — no download required.",
  keywords: [
    "screen recorder",
    "screen recording",
    "record screen online",
    "share screen recording",
    "free screen recorder",
    "screen video sharing",
    "Screenbolt",
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
      </body>
    </html>
  );
}
