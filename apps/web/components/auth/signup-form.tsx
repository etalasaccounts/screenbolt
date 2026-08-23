"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";

import { ApiClientError, apiPost } from "@/lib/client/api-fetch";

export function SignupForm({
  googleEnabled,
  callbackUrl = "/home",
}: {
  googleEnabled: boolean;
  callbackUrl?: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setPending(true);
    try {
      await apiPost("/api/auth/signup", { name, email, password });

      const loginRes = await signIn("credentials", { email, password, redirect: false });
      if (loginRes?.error) {
        setError("Account created — please log in.");
        setPending(false);
        router.push(callbackUrl === "/home" ? "/login" : `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong. Please try again.");
      setPending(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-4">
      {googleEnabled && (
        <>
          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl })}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-black/[.12] bg-white text-[0.9375rem] transition-colors hover:bg-black/[.04]"
          >
            <Icon icon="logos:google-icon" style={{ fontSize: "1.1rem" }} />
            Continue with Google
          </button>
          <div className="flex items-center gap-2">
            <hr className="w-full border-black/[.08]" />
            <span className="text-xs text-[#090b0c]/40">or</span>
            <hr className="w-full border-black/[.08]" />
          </div>
        </>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
          required
          autoComplete="name"
          className="h-12 w-full rounded-2xl border border-black/[.12] bg-white px-4 text-[0.9375rem] outline-none transition-colors focus:border-black/30"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          autoComplete="email"
          className="h-12 w-full rounded-2xl border border-black/[.12] bg-white px-4 text-[0.9375rem] outline-none transition-colors focus:border-black/30"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
          autoComplete="new-password"
          className="h-12 w-full rounded-2xl border border-black/[.12] bg-white px-4 text-[0.9375rem] outline-none transition-colors focus:border-black/30"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="flex h-12 w-full items-center justify-center rounded-full bg-[#090b0c] px-5 text-[0.9375rem] text-white transition-opacity hover:opacity-85 disabled:opacity-50"
        >
          {pending ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="text-center text-sm text-[#090b0c]/50">
        Already have an account?{" "}
        <a href="/login" className="font-medium text-[#090b0c] underline underline-offset-2">
          Log in
        </a>
      </p>
    </div>
  );
}
