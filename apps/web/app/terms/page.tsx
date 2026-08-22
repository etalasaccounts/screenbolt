import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { termsSections } from "@/components/legal/terms-content";

export const metadata: Metadata = {
  title: "Terms of Service — Screenbolt",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      lastUpdated="January 15, 2025"
      sections={termsSections}
      related={{ href: "/privacy", label: "View Privacy Policy" }}
    />
  );
}
