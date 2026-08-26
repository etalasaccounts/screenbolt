import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { privacySections } from "@/components/legal/privacy-content";

export const metadata: Metadata = {
  title: "Privacy Policy — Screenbolt",
  description:
    "Learn how Screenbolt collects, uses, and protects your personal data. Read our complete privacy policy to understand how we handle your information.",
  alternates: {
    canonical: "https://screenbolt.com/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      lastUpdated="January 15, 2025"
      sections={privacySections}
      related={{ href: "/terms", label: "View Terms of Service" }}
    />
  );
}
