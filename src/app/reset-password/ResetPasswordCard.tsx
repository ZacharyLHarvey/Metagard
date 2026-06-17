"use client";

import Link from "next/link";
import { useState } from "react";
import ThemedWordmark from "@/components/ThemedWordmark";
import { supabaseBrowser } from "@/lib/browser/supabaseBrowser";
import type { AppTheme } from "@/lib/useDataTheme";

const PASSWORD_MIN = 8;

function friendlyAuthMessage(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes("rate limit") || m.includes("too many requests")) {
    return "Too many attempts. Please wait a few minutes and try again.";
  }
  return raw;
}

function validatePasswords(password: string, confirmPassword: string): string | undefined {
  if (!password) return "Password Is Required.";
  if (password.length < PASSWORD_MIN) {
    return `Password Must Be at Least ${PASSWORD_MIN} Characters.`;
  }
  if (!confirmPassword) return "Please Confirm Your Password.";
  if (password !== confirmPassword) return "Passwords Do Not Match.";
  return undefined;
}

const alertErrorClass =
  "rounded-md border border-red-800/50 bg-red-950/40 px-3 py-2.5 text-sm text-red-200";

const inputClass =
  "p-3 rounded-md bg-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-600 border border-neutral-700/80";

const inputErrorClass = "ring-2 ring-red-500/80 border-red-600/60";

const wordmarkOnCardClass =
  "relative mx-auto aspect-[900/650] w-full max-w-[min(100%,240px)] sm:max-w-[280px]";

type ResetPasswordCardProps = {
  initialTheme: AppTheme;
  hasRecoverySession: boolean;
};

export default function ResetPasswordCard({
  initialTheme,
  hasRecoverySession,
}: ResetPasswordCardProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const validationError = validatePasswords(password, confirmPassword);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    const supabase = supabaseBrowser();

    const { error: updateError } = await supabase.auth.updateUser({ password });

    setSubmitting(false);

    if (updateError) {
      setError(friendlyAuthMessage(updateError.message));
      return;
    }

    window.location.href = "/";
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
        Set a New Password
      </h1>

      {!hasRecoverySession ? (
        <div className="flex flex-col gap-4">
          <div className={alertErrorClass} role="alert">
            This Reset Link Is Invalid or Has Expired. Request a New One to Continue.
          </div>
          <p className="text-center text-sm text-neutral-400">
            <Link
              href="/forgot-password"
              className="text-blue-400 hover:text-blue-300 font-medium"
            >
              Request Reset Link
            </Link>
            {" · "}
            <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium">
              Back to Log In
            </Link>
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1">
            <label htmlFor="reset-password" className="text-sm text-neutral-400">
              New Password
            </label>
            <input
              id="reset-password"
              type="password"
              name="password"
              autoComplete="new-password"
              className={`${inputClass} ${error ? inputErrorClass : ""}`}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              aria-invalid={!!error}
              aria-describedby={error ? "reset-error" : "reset-password-hint"}
            />
            <p id="reset-password-hint" className="text-neutral-500 text-xs">
              At Least {PASSWORD_MIN} Characters (Stricter Rules May Apply on the Server).
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="reset-confirm-password" className="text-sm text-neutral-400">
              Confirm Password
            </label>
            <input
              id="reset-confirm-password"
              type="password"
              name="confirm-password"
              autoComplete="new-password"
              className={`${inputClass} ${error ? inputErrorClass : ""}`}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setError("");
              }}
              aria-invalid={!!error}
              aria-describedby={error ? "reset-error" : undefined}
            />
          </div>

          {error ? (
            <div id="reset-error" className={alertErrorClass} role="alert" aria-live="polite">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="mt-1 p-3 rounded-md bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:pointer-events-none text-white font-medium transition"
          >
            {submitting ? "Updating…" : "Update Password"}
          </button>
        </form>
      )}
    </div>
  );
}
