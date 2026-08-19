import "./globals.css";

// Next
import type { Metadata, Viewport } from "next";
import Script from "next/script";

// Provider
import { ThemeProvider } from "@/providers/theme-provider";
import { ReduxProvider } from "@/providers/redux-provider";
import QueryProvider from "@/providers/query-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { DropboxProvider } from "@/providers/dropbox-provider";
import { TooltipProvider } from "@/components/ui/tooltip";

// Components
import { Toaster } from "@/components/ui/sonner";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = {
  metadataBase: new URL('https://screenbolt.app'),
  title: {
    default: "Screenbolt - Fast Screen Recording & Video Sharing",
    template: "%s | Screenbolt",
  },
  description:
    "Record, share and collaborate with instant screen recordings. Fast, secure, and easy to use video collaboration tool for teams and individuals.",
  keywords: [
    "screen recording",
    "video sharing",
    "screen capture",
    "free screen recorder",
    "screen recorder",
    "online recording",
  ],
  authors: [{ name: "Screenbolt" }],
  creator: "Screenbolt",
  publisher: "Screenbolt",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://Screenbolt.app",
    siteName: "Screenbolt",
    title: "Screenbolt - Fast Screen Recording & Video Sharing",
    description:
      "Record, share and collaborate with instant screen recordings. Fast, secure, and easy to use video collaboration tool for teams and individuals.",
    images: [
      {
        url: "/assets/logo-black.png",
        width: 1200,
        height: 630,
        alt: "Screenbolt - Screen Recording Tool",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Screenbolt - Fast Screen Recording & Video Sharing",
    description:
      "Record, share and collaborate with instant screen recordings. Fast, secure, and easy to use video collaboration tool for teams and individuals.",
    images: ["/assets/logo-black.png"],
    creator: "@Screenbolt",
  },
  verification: {
    google: "google-site-verification-code",
  },
  alternates: {
    canonical: "https://Screenbolt.app",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: any) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className="font-sans bg-background">
        <QueryProvider>
          <AuthProvider>
            <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
              <DropboxProvider>
                <ReduxProvider>
                  <TooltipProvider>{children}</TooltipProvider>

                  <Toaster />
                  {/* Floating theme toggle button */}
                  <div className="fixed top-6 right-6 z-50 hidden">
                    <ThemeToggle />
                  </div>
                </ReduxProvider>
              </DropboxProvider>
            </ThemeProvider>
          </AuthProvider>
        </QueryProvider>
      <Script
        defer
        src="https://cloud.umami.is/script.js"
        data-website-id="23fd50ff-5c52-4563-b815-acb8c28d0205"
      />
      </body>
    </html>
  );
}
