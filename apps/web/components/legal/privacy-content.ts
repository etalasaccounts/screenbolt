export interface LegalBlock {
  kind: "p" | "list" | "h3";
  text?: string;
  items?: string[];
}

export interface LegalSection {
  heading: string;
  blocks: LegalBlock[];
}

export const privacySections: LegalSection[] = [
  {
    heading: "1. Introduction",
    blocks: [
      {
        kind: "p",
        text: 'Welcome to Screenbolt ("we," "our," or "us"). We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our video recording and sharing platform.',
      },
    ],
  },
  {
    heading: "2. Information We Collect",
    blocks: [
      { kind: "h3", text: "2.1 Personal Information" },
      {
        kind: "list",
        items: [
          "Email address and name when you create an account",
          "Profile information you choose to provide",
          "Payment information for subscription services",
          "Communication preferences and settings",
        ],
      },
      { kind: "h3", text: "2.2 Video Content" },
      {
        kind: "list",
        items: [
          "Screen recordings and video content you create",
          "Audio recordings included in your videos",
          "Metadata associated with your recordings (timestamps, duration, etc.)",
          "Comments and annotations you add to videos",
        ],
      },
      { kind: "h3", text: "2.3 Technical Information" },
      {
        kind: "list",
        items: [
          "IP address and device information",
          "Browser type and version",
          "Operating system and screen resolution",
          "Usage patterns and feature interactions",
          "Cookies and similar tracking technologies",
        ],
      },
    ],
  },
  {
    heading: "3. How We Use Your Information",
    blocks: [
      {
        kind: "list",
        items: [
          "Provide and maintain our video recording and sharing services",
          "Process your recordings and enable sharing functionality",
          "Authenticate your account and prevent unauthorized access",
          "Send important service updates and security notifications",
          "Improve our platform based on usage analytics",
          "Provide customer support and respond to inquiries",
          "Process payments and manage subscriptions",
          "Comply with legal obligations and enforce our terms",
        ],
      },
    ],
  },
  {
    heading: "4. Information Sharing and Disclosure",
    blocks: [
      {
        kind: "h3",
        text: "4.1 Video Sharing",
      },
      {
        kind: "p",
        text: "Your video content is shared only according to the privacy settings you choose. You control whether videos are private, shared with specific people, or made publicly accessible.",
      },
      {
        kind: "h3",
        text: "4.2 Service Providers",
      },
      {
        kind: "p",
        text: "We may share information with trusted third-party service providers who assist us in operating our platform, including cloud storage providers, payment processors, and analytics services. These providers are bound by confidentiality agreements.",
      },
      {
        kind: "h3",
        text: "4.3 Legal Requirements",
      },
      {
        kind: "p",
        text: "We may disclose information when required by law, to protect our rights, or to ensure the safety of our users and the public.",
      },
    ],
  },
  {
    heading: "5. Data Storage and Security",
    blocks: [
      {
        kind: "list",
        items: [
          "We use industry-standard encryption to protect your data in transit and at rest",
          "Video content is stored securely in encrypted cloud storage",
          "Access to your data is restricted to authorized personnel only",
          "We regularly audit our security practices and update our systems",
          "We implement multi-factor authentication and access controls",
        ],
      },
    ],
  },
  {
    heading: "6. Your Rights and Choices",
    blocks: [
      { kind: "h3", text: "6.1 Account Management" },
      {
        kind: "list",
        items: [
          "Access and update your personal information",
          "Delete your videos and account data",
          "Export your video content",
          "Modify privacy settings for your recordings",
        ],
      },
      { kind: "h3", text: "6.2 Communication Preferences" },
      {
        kind: "list",
        items: [
          "Opt out of marketing communications",
          "Choose notification preferences",
          "Control cookie settings in your browser",
        ],
      },
    ],
  },
  {
    heading: "7. Data Retention",
    blocks: [
      {
        kind: "p",
        text: "We retain your personal information and video content for as long as your account is active or as needed to provide services. When you delete your account, we will delete your personal information and video content within 30 days, except where we are required to retain certain information for legal or regulatory purposes.",
      },
    ],
  },
  {
    heading: "8. International Data Transfers",
    blocks: [
      {
        kind: "p",
        text: "Your information may be transferred to and processed in countries other than your own. We ensure that such transfers comply with applicable data protection laws and implement appropriate safeguards to protect your information.",
      },
    ],
  },
  {
    heading: "9. Children's Privacy",
    blocks: [
      {
        kind: "p",
        text: "Our service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us.",
      },
    ],
  },
  {
    heading: "10. Changes to This Privacy Policy",
    blocks: [
      {
        kind: "p",
        text: 'We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the "Last updated" date. We encourage you to review this Privacy Policy periodically.',
      },
    ],
  },
  {
    heading: "11. Contact Us",
    blocks: [
      {
        kind: "p",
        text: "If you have any questions about this Privacy Policy or our privacy practices, please contact us at h@etalas.com.",
      },
    ],
  },
];
