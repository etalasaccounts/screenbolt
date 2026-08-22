import type { LegalSection } from "./privacy-content";

export const termsSections: LegalSection[] = [
  {
    heading: "1. Acceptance of Terms",
    blocks: [
      {
        kind: "p",
        text: 'By accessing or using Screenbolt ("the Service"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of these terms, then you may not access the Service. These Terms apply to all visitors, users, and others who access or use the Service.',
      },
    ],
  },
  {
    heading: "2. Description of Service",
    blocks: [
      {
        kind: "p",
        text: "Screenbolt is a video recording and sharing platform that allows users to:",
      },
      {
        kind: "list",
        items: [
          "Record screen activities and create video content",
          "Share videos with others through secure links",
          "Collaborate through video messaging and comments",
          "Store and organize video content in the cloud",
          "Access analytics and viewer insights",
        ],
      },
    ],
  },
  {
    heading: "3. User Accounts",
    blocks: [
      { kind: "h3", text: "3.1 Account Creation" },
      {
        kind: "list",
        items: [
          "You must provide accurate and complete information when creating an account",
          "You are responsible for maintaining the security of your account credentials",
          "You must be at least 13 years old to create an account",
          "One person or legal entity may maintain no more than one free account",
        ],
      },
      { kind: "h3", text: "3.2 Account Responsibilities" },
      {
        kind: "list",
        items: [
          "You are responsible for all activities that occur under your account",
          "You must notify us immediately of any unauthorized use of your account",
          "You may not share your account credentials with others",
          "You may not use another user's account without permission",
        ],
      },
    ],
  },
  {
    heading: "4. Acceptable Use Policy",
    blocks: [
      {
        kind: "h3",
        text: "4.1 Permitted Uses",
      },
      {
        kind: "p",
        text: "You may use Screenbolt for legitimate business, educational, and personal purposes, including creating tutorials, presentations, demonstrations, and collaborative content.",
      },
      {
        kind: "h3",
        text: "4.2 Prohibited Uses",
      },
      {
        kind: "p",
        text: "You may not use the Service to:",
      },
      {
        kind: "list",
        items: [
          "Upload, share, or distribute illegal, harmful, or offensive content",
          "Violate any applicable laws or regulations",
          "Infringe upon intellectual property rights of others",
          "Record or share content without proper authorization",
          "Distribute malware, viruses, or other harmful code",
          "Engage in harassment, bullying, or threatening behavior",
          "Spam or send unsolicited communications",
          "Attempt to gain unauthorized access to our systems",
          "Interfere with or disrupt the Service",
          "Use the Service for competitive intelligence or benchmarking",
        ],
      },
    ],
  },
  {
    heading: "5. Content and Intellectual Property",
    blocks: [
      { kind: "h3", text: "5.1 Your Content" },
      {
        kind: "list",
        items: [
          "You retain ownership of all content you create and upload",
          "You grant us a limited license to store, process, and display your content",
          "You are responsible for ensuring you have rights to all content you upload",
          "You may delete your content at any time",
        ],
      },
      { kind: "h3", text: "5.2 Our Intellectual Property" },
      {
        kind: "list",
        items: [
          "Screenbolt and its features are protected by intellectual property laws",
          "You may not copy, modify, or distribute our software or content",
          "Our trademarks and logos may not be used without permission",
          "We reserve all rights not expressly granted to you",
        ],
      },
      { kind: "h3", text: "5.3 Copyright Policy" },
      {
        kind: "p",
        text: "We respect intellectual property rights and will respond to valid copyright infringement notices. If you believe your copyright has been infringed, please contact us with detailed information about the alleged infringement.",
      },
    ],
  },
  {
    heading: "6. Privacy and Data Protection",
    blocks: [
      {
        kind: "p",
        text: "Your privacy is important to us. Our collection and use of personal information is governed by our Privacy Policy, which is incorporated into these Terms by reference. By using the Service, you consent to the collection and use of information as described in our Privacy Policy.",
      },
    ],
  },
  {
    heading: "7. Subscription and Payment Terms",
    blocks: [
      { kind: "h3", text: "7.1 Subscription Plans" },
      {
        kind: "list",
        items: [
          "We offer both free and paid subscription plans",
          "Paid plans provide additional features and storage capacity",
          "Subscription fees are billed in advance on a recurring basis",
          "All fees are non-refundable except as required by law",
        ],
      },
      { kind: "h3", text: "7.2 Payment Processing" },
      {
        kind: "list",
        items: [
          "Payments are processed by third-party payment providers",
          "You authorize us to charge your payment method for applicable fees",
          "You must keep your payment information current and accurate",
          "We may suspend service for failed payments",
        ],
      },
      { kind: "h3", text: "7.3 Cancellation and Refunds" },
      {
        kind: "list",
        items: [
          "You may cancel your subscription at any time",
          "Cancellation takes effect at the end of your current billing period",
          "No refunds are provided for partial months of service",
          "We may offer refunds at our discretion for exceptional circumstances",
        ],
      },
    ],
  },
  {
    heading: "8. Service Availability and Modifications",
    blocks: [
      { kind: "h3", text: "8.1 Service Availability" },
      {
        kind: "list",
        items: [
          "We strive to maintain high service availability but cannot guarantee 100% uptime",
          "Scheduled maintenance may temporarily interrupt service",
          "We are not liable for service interruptions beyond our control",
        ],
      },
      { kind: "h3", text: "8.2 Service Modifications" },
      {
        kind: "list",
        items: [
          "We may modify, update, or discontinue features at any time",
          "We will provide reasonable notice of material changes",
          "Continued use of the Service constitutes acceptance of modifications",
        ],
      },
    ],
  },
  {
    heading: "9. Termination",
    blocks: [
      { kind: "h3", text: "9.1 Termination by You" },
      {
        kind: "p",
        text: "You may terminate your account at any time by contacting us or using the account deletion feature. Upon termination, your access to the Service will cease immediately.",
      },
      { kind: "h3", text: "9.2 Termination by Us" },
      {
        kind: "p",
        text: "We may terminate or suspend your account immediately if you violate these Terms, engage in prohibited activities, or for any other reason at our sole discretion.",
      },
      { kind: "h3", text: "9.3 Effect of Termination" },
      {
        kind: "list",
        items: [
          "Your right to use the Service will cease immediately",
          "We may delete your account and content after termination",
          "Provisions that should survive termination will remain in effect",
        ],
      },
    ],
  },
  {
    heading: "10. Disclaimers and Limitation of Liability",
    blocks: [
      { kind: "h3", text: "10.1 Service Disclaimers" },
      {
        kind: "p",
        text: 'THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND. WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.',
      },
      { kind: "h3", text: "10.2 Limitation of Liability" },
      {
        kind: "p",
        text: "TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOST PROFITS, DATA LOSS, OR BUSINESS INTERRUPTION.",
      },
    ],
  },
  {
    heading: "11. Indemnification",
    blocks: [
      {
        kind: "p",
        text: "You agree to indemnify and hold us harmless from any claims, damages, losses, or expenses arising from your use of the Service, violation of these Terms, or infringement of any rights of another party.",
      },
    ],
  },
  {
    heading: "12. Governing Law and Dispute Resolution",
    blocks: [
      { kind: "h3", text: "12.1 Governing Law" },
      {
        kind: "p",
        text: "These Terms are governed by the laws of the State of California, United States, without regard to conflict of law principles.",
      },
      { kind: "h3", text: "12.2 Dispute Resolution" },
      {
        kind: "p",
        text: "Any disputes arising from these Terms or your use of the Service will be resolved through binding arbitration in accordance with the rules of the American Arbitration Association.",
      },
    ],
  },
  {
    heading: "13. Changes to Terms",
    blocks: [
      {
        kind: "p",
        text: 'We reserve the right to modify these Terms at any time. We will notify users of material changes by posting the updated Terms on our website and updating the "Last updated" date. Your continued use of the Service after changes become effective constitutes acceptance of the new Terms.',
      },
    ],
  },
  {
    heading: "14. Severability",
    blocks: [
      {
        kind: "p",
        text: "If any provision of these Terms is found to be unenforceable or invalid, the remaining provisions will continue in full force and effect.",
      },
    ],
  },
  {
    heading: "15. Contact Information",
    blocks: [
      {
        kind: "p",
        text: "If you have any questions about these Terms of Service, please contact us at h@etalas.com.",
      },
    ],
  },
];
