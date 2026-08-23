import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = {
  title: "Start Recording Free with Screenbolt - Sign Up Today",
  description:
    "Create your free Screenbolt account now. Record, edit, and share your screen in seconds. No credit card required.",
  alternates: {
    canonical: "https://screenbolt.app/signup",
  },
  robots: {
    index: false,
    follow: true,
  },
};

function safeCallbackUrl(url: string | undefined): string {
  if (!url || !url.startsWith("/") || url.startsWith("//")) return "/home";
  return url;
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  const redirectTo = safeCallbackUrl(callbackUrl);

  const session = await auth();
  if (session?.user) {
    redirect(redirectTo);
  }

  const googleEnabled = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

  return (
    <div className="w-full max-w-sm">
      <h1 className="mb-8 text-center text-[2rem] font-normal leading-tight tracking-tight">
        Record &amp; share — <span className="font-serif-italic">free</span>
      </h1>
      <SignupForm googleEnabled={googleEnabled} callbackUrl={redirectTo} />
    </div>
  );
}
