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
  metadataBase: new URL("https://screenbolt.app"),
  title: "Screenbolt",
  description:
    "Record your screen and share it in seconds. The fastest way to record your screen and share it with anyone.",
  openGraph: {
    type: "website",
    siteName: "Screenbolt",
    title: "Screenbolt",
    description:
      "Record your screen and share it in seconds. The fastest way to record your screen and share it with anyone.",
    url: "https://screenbolt.app",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Screenbolt",
    description:
      "Record your screen and share it in seconds. The fastest way to record your screen and share it with anyone.",
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
