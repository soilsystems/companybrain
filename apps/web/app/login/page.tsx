"use client";

import { ArrowRight, LockKeyhole } from "lucide-react";
import { FormEvent, useState } from "react";

import { env } from "@/lib/env";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setError("Authentication is not configured for this deployment.");
      return;
    }
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const endpoint =
        mode === "signup" ? "signup" : "token?grant_type=password";
      const response = await fetch(
        `${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/${endpoint}`,
        {
          method: "POST",
          headers: {
            apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: form.get("email"),
            password: form.get("password"),
          }),
        },
      );
      const payload = (await response.json()) as {
        access_token?: string;
        error_description?: string;
        msg?: string;
      };
      if (!response.ok)
        throw new Error(
          payload.error_description || payload.msg || "Authentication failed.",
        );
      if (!payload.access_token) {
        setNotice("Check your email to confirm the account, then sign in.");
        setMode("signin");
        return;
      }
      window.localStorage.setItem(
        "companybrain.access_token",
        payload.access_token,
      );
      window.location.assign("/app");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Authentication failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
      <section className="w-full max-w-[440px] rounded-panel border bg-surface/90 p-7 shadow-panel backdrop-blur lg:p-10">
        <div className="flex items-center gap-3 font-display text-lg font-bold">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-xs font-extrabold text-white">
            CB
          </span>{" "}
          Company Brain
        </div>
        <div className="mt-7 flex h-11 w-11 items-center justify-center rounded-base bg-primary/10 text-primary">
          <LockKeyhole className="h-5 w-5" />
        </div>
        <h1 className="mt-5 font-display text-2xl font-bold">
          Access Company Brain
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {mode === "signin"
            ? "Sign in to search private workspaces, survey records, and cited business documents."
            : "Create your secure workspace. Your first sign-in provisions an isolated records area automatically."}
        </p>
        <form className="mt-7 space-y-4" onSubmit={signIn}>
          <label className="block text-xs font-bold">
            Email address
            <input
              autoComplete="email"
              className="mt-2 h-11 w-full rounded-base border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              name="email"
              placeholder="you@company.com"
              required
              type="email"
            />
          </label>
          <label className="block text-xs font-bold">
            Password
            <input
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
              }
              className="mt-2 h-11 w-full rounded-base border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              name="password"
              required
              type="password"
            />
          </label>
          {error ? (
            <p className="rounded-base border border-destructive/30 bg-destructive-muted p-3 text-xs text-destructive">
              {error}
            </p>
          ) : null}
          {notice ? (
            <p className="rounded-base border border-primary/30 bg-primary/10 p-3 text-xs text-primary">
              {notice}
            </p>
          ) : null}
          <button
            className="flex h-11 w-full items-center justify-center gap-2 rounded-base bg-foreground text-sm font-bold text-background hover:bg-primary hover:text-white disabled:opacity-50"
            disabled={loading}
            type="submit"
          >
            {loading
              ? "Authorizing..."
              : mode === "signin"
                ? "Authorize session"
                : "Create secure workspace"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
        <button
          className="mt-5 w-full text-center text-xs font-bold text-primary hover:underline"
          onClick={() => {
            setMode((value) => (value === "signin" ? "signup" : "signin"));
            setError("");
            setNotice("");
          }}
          type="button"
        >
          {mode === "signin"
            ? "New to Company Brain? Create an account"
            : "Already have an account? Sign in"}
        </button>
        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          Private storage · server-authorized access · audited downloads
        </p>
      </section>
    </main>
  );
}
