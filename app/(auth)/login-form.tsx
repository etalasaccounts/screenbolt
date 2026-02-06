"use client";

// Hooks & Next
import { useForm } from "react-hook-form";
import {
  useLogin,
  useGoogleAuth,
  useDropboxAuth,
  useOAuthHandler,
} from "@/hooks/use-auth";
import Image from "next/image";

// Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Validations
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, LoginInput } from "@/schemas/auth";

export default function LoginForm() {
  const login = useLogin();
  const { initiateGoogleAuth } = useGoogleAuth();
  const { initiateDropboxAuth } = useDropboxAuth();

  // Handle OAuth results
  useOAuthHandler();

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const handleLogin = async (input: LoginInput) => {
    login.mutate(input);
  };

  return (
    <>
      <div className="flex flex-col w-full gap-4">
        <Button
          variant={"outline"}
          className="w-full h-12 rounded-2xl text-base"
          type="button"
          disabled={login.isPending}
          onClick={initiateGoogleAuth}
        >
          <Image
            src="/assets/google-logo.svg"
            alt="Google"
            width={24}
            height={24}
            className="mr-2"
          />
          Continue with Google
        </Button>
        <Button
          variant={"outline"}
          className="w-full h-12 rounded-2xl text-base"
          type="button"
          disabled={login.isPending}
          onClick={initiateDropboxAuth}
        >
          <Image
            src="/assets/dropbox-logo.svg"
            alt="Dropbox"
            width={24}
            height={24}
            className="mr-2"
          />
          Continue with Dropbox
        </Button>
        <div className="flex gap-2 items-center">
          <hr className="w-full h-0.5 bg-border rounded-full" />
          or <hr className="w-full h-0.5 bg-border rounded-full" />
        </div>
        <form onSubmit={form.handleSubmit(handleLogin)} className="space-y-4">
          <div className="space-y-1">
            <Input
              {...form.register("email")}
              type="email"
              placeholder="Email"
              disabled={login.isPending}
              className="h-12 rounded-2xl md:text-base"
            />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Input
              {...form.register("password")}
              type="password"
              placeholder="Password"
              disabled={login.isPending}
              className="h-12 rounded-2xl md:text-base"
            />
            {form.formState.errors.password && (
              <p className="text-sm text-destructive">
                {form.formState.errors.password.message}
              </p>
            )}
          </div>
          <Button
            className="w-full h-12 rounded-2xl text-base"
            type="submit"
            disabled={login.isPending}
          >
            {login.isPending ? "Logging in..." : "Continue with Email"}
          </Button>
        </form>
      </div>
    </>
  );
}
