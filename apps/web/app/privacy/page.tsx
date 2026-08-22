import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { privacySections } from "@/components/legal/privacy-content";

export const metadata: Metadata = {
  title: "Privacy Policy — Screenbolt",
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
