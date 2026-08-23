import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Login to Screenbolt - Access Your Recordings",
  description:
    "Sign in to your Screenbolt account to manage your screen recordings and shared videos.",
  alternates: {
    canonical: "https://screenbolt.app/login",
  },
  robots: {
    index: false,
    follow: true,
  },
};

// Only allow same-origin relative paths (e.g. "/connect?code=...") — never an
// absolute/protocol-relative URL, to avoid using this as an open redirect.
function safeCallbackUrl(url: string | undefined): string {
  if (!url || !url.startsWith("/") || url.startsWith("//")) return "/home";
  return url;
}

export default async function LoginPage({
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
        Straight back to <span className="font-serif-italic">recording</span>
      </h1>
      <LoginForm googleEnabled={googleEnabled} callbackUrl={redirectTo} />
    </div>
  );
}
