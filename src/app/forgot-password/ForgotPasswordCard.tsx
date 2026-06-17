"use client";

import Link from "next/link";
import { useState } from "react";
import ThemedWordmark from "@/components/ThemedWordmark";
import { supabaseBrowser } from "@/lib/browser/supabaseBrowser";
import type { AppTheme } from "@/lib/useDataTheme";

function validateEmail(email: string): string | undefined {
  const t = email.trim();
  if (!t) return "Email Is Required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) {
    return "Enter a Valid Email Address.";
  }
  return undefined;
}

function friendlyAuthMessage(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes("rate limit") || m.includes("too many requests")) {
    return "Too many attempts. Please wait a few minutes and try again.";
  }
  return raw;
}

const alertErrorClass =
  "rounded-md border border-red-800/50 bg-red-950/40 px-3 py-2.5 text-sm text-red-200";

const alertInfoClass =
  "rounded-md border border-neutral-700 bg-neutral-800/60 px-3 py-2.5 text-sm text-neutral-300";

const inputClass =
  "p-3 rounded-md bg-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-600 border border-neutral-700/80";

const wordmarkOnCardClass =
  "relative mx-auto aspect-[900/650] w-full max-w-[min(100%,240px)] sm:max-w-[280px]";

type ForgotPasswordCardProps = {
  initialTheme: AppTheme;
};

export default function ForgotPasswordCard({ initialTheme }: ForgotPasswordCardProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setInfo("");

    const validationError = validateEmail(email);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    const supabase = supabaseBrowser();

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback?next=/reset-password`
        : undefined;

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      ...(redirectTo ? { redirectTo } : {}),
    });

    setSubmitting(false);

    if (resetError) {
      setError(friendlyAuthMessage(resetError.message));
      return;
    }

    setInfo("Check Your Email for a Reset Link.");
  }

  return (
    <div className="w-full max-w-sm rounded-xl border border-neutral-800 bg-neutral-900/90 p-6 shadow-xl backdrop-blur-sm">
      <div className="mb-5">
        <ThemedWordmark
          initialTheme={initialTheme}
          priority
          wrapperClassName={wordmarkOnCardClass}
        />
      </div>

      <h1 className="text-lg font-semibold text-center text-neutral-100 mb-6">
        Reset Your Password
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1">
          <label htmlFor="forgot-email" className="text-sm text-neutral-400">
            Email
          </label>
          <input
            id="forgot-email"
            type="email"
            name="email"
            autoComplete="email"
            className={inputClass}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
              setInfo("");
            }}
            aria-invalid={!!error}
            aria-describedby={error ? "forgot-error" : info ? "forgot-info" : undefined}
          />
        </div>

        {error ? (
          <div id="forgot-error" className={alertErrorClass} role="alert" aria-live="polite">
            {error}
          </div>
        ) : null}

        {info ? (
          <div id="forgot-info" className={alertInfoClass} role="status" aria-live="polite">
            <p>{info}</p>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="mt-1 p-3 rounded-md bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:pointer-events-none text-white font-medium transition"
        >
          {submitting ? "Sending…" : "Send Reset Link"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-neutral-400">
        <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium">
          Back to Log In
        </Link>
      </p>
    </div>
  );
}
