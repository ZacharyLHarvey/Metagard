"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import ThemedWordmark from "@/components/ThemedWordmark";
import type { AppTheme } from "@/lib/useDataTheme";
import { supabaseBrowser } from "@/lib/browser/supabaseBrowser";

const DISPLAY_NAME_MAX = 80;
const PASSWORD_MIN = 8;

type AuthMode = "login" | "signup";

type FieldErrors = {
  email?: string;
  displayName?: string;
  password?: string;
};

function validateLoginEmail(email: string): string | undefined {
  const t = email.trim();
  if (!t) return "Email Is Required.";
  return undefined;
}

function validateLoginPassword(password: string): string | undefined {
  if (!password) return "Password Is Required.";
  return undefined;
}

function validateSignUp(
  email: string,
  displayName: string,
  password: string
): FieldErrors {
  const errors: FieldErrors = {};
  const e = email.trim();
  if (!e) errors.email = "Email Is Required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
    errors.email = "Enter a Valid Email Address.";
  }

  const name = displayName.trim();
  if (!name) errors.displayName = "Display Name Is Required.";
  else if (name.length > DISPLAY_NAME_MAX) {
    errors.displayName = `Display Name Must Be at Most ${DISPLAY_NAME_MAX} Characters.`;
  }

  if (!password) errors.password = "Password Is Required.";
  else if (password.length < PASSWORD_MIN) {
    errors.password = `Password Must Be at Least ${PASSWORD_MIN} Characters.`;
  }

  return errors;
}

const alertErrorClass =
  "rounded-md border border-red-800/50 bg-red-950/40 px-3 py-2.5 text-sm text-red-200";

const alertInfoClass =
  "rounded-md border border-neutral-700 bg-neutral-800/60 px-3 py-2.5 text-sm text-neutral-300";

const wordmarkOnCardClass =
  "relative mx-auto aspect-[900/650] w-full max-w-[min(100%,240px)] sm:max-w-[280px]";

type LoginAuthCardProps = {
  initialTheme: AppTheme;
};

export default function LoginAuthCard({ initialTheme }: LoginAuthCardProps) {
  const [mode, setMode] = useState<AuthMode>("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpDisplayName, setSignUpDisplayName] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpFieldErrors, setSignUpFieldErrors] = useState<FieldErrors>({});
  const [signUpError, setSignUpError] = useState("");
  const [signUpInfo, setSignUpInfo] = useState("");
  const [signUpSubmitting, setSignUpSubmitting] = useState(false);

  const setAuthMode = useCallback((next: AuthMode) => {
    setMode(next);
    setLoginError("");
    setSignUpError("");
    setSignUpInfo("");
  }, []);

  const clearSignUpFieldError = useCallback((key: keyof FieldErrors) => {
    setSignUpFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoginError("");

    const ve = validateLoginEmail(email);
    const vp = validateLoginPassword(password);
    if (ve || vp) {
      setLoginError(ve ?? vp ?? "");
      return;
    }

    setLoginSubmitting(true);
    const supabase = supabaseBrowser();

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoginSubmitting(false);

    if (error) {
      setLoginError(error.message);
      return;
    }

    window.location.href = "/";
  }

  async function handleSignUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSignUpError("");
    setSignUpInfo("");

    const errors = validateSignUp(signUpEmail, signUpDisplayName, signUpPassword);
    if (Object.keys(errors).length > 0) {
      setSignUpFieldErrors(errors);
      return;
    }
    setSignUpFieldErrors({});

    setSignUpSubmitting(true);
    const supabase = supabaseBrowser();

    const siteBase =
      (typeof process !== "undefined" &&
        process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "")) ||
      (typeof window !== "undefined" ? window.location.origin : "");
    const emailRedirectTo = siteBase
      ? `${siteBase.replace(/\/$/, "")}/auth/callback`
      : undefined;

    const trimmedEmail = signUpEmail.trim();
    const trimmedName = signUpDisplayName.trim();

    const { error: signUpErr } = await supabase.auth.signUp({
      email: trimmedEmail,
      password: signUpPassword,
      options: {
        ...(emailRedirectTo ? { emailRedirectTo } : {}),
        data: {
          display_name: trimmedName,
        },
      },
    });

    if (signUpErr) {
      setSignUpSubmitting(false);
      setSignUpError(signUpErr.message);
      return;
    }

    const {
      data: { user },
      error: getUserErr,
    } = await supabase.auth.getUser();

    setSignUpSubmitting(false);

    if (getUserErr) {
      setSignUpError(getUserErr.message);
      return;
    }

    if (user) {
      window.location.href = "/";
      return;
    }

    setSignUpInfo(
      "Account Created. Check Your Email for a Confirmation Link, then Sign in with Log In."
    );
  }

  const inputClass =
    "p-3 rounded-md bg-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-600 border border-neutral-700/80";
  const inputErrorClass = "ring-2 ring-red-500/80 border-red-600/60";

  const tabBase =
    "flex-1 rounded-md py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900";
  const tabInactive = "text-neutral-400 hover:text-neutral-200";
  const tabActive = "bg-neutral-700 text-white shadow-sm";

  return (
    <div className="w-full max-w-sm rounded-xl border border-neutral-800 bg-neutral-900/90 p-6 shadow-xl backdrop-blur-sm">
      <div className="mb-5">
        <ThemedWordmark
          initialTheme={initialTheme}
          priority
          wrapperClassName={wordmarkOnCardClass}
        />
      </div>

      <div
        className="flex rounded-lg bg-neutral-950/80 p-1 border border-neutral-800 mb-6"
        role="tablist"
        aria-label="Authentication Mode"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === "login"}
          aria-controls="login-panel"
          id="tab-login"
          className={`${tabBase} ${mode === "login" ? tabActive : tabInactive}`}
          onClick={() => setAuthMode("login")}
        >
          Log In
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "signup"}
          aria-controls="signup-panel"
          id="tab-signup"
          className={`${tabBase} ${mode === "signup" ? tabActive : tabInactive}`}
          onClick={() => setAuthMode("signup")}
        >
          Sign Up
        </button>
      </div>

      {mode === "login" ? (
        <form
          id="login-panel"
          role="tabpanel"
          aria-labelledby="tab-login"
          onSubmit={handleLogin}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-1">
            <label htmlFor="login-email" className="text-sm text-neutral-400">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              name="email"
              autoComplete="email"
              className={inputClass}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setLoginError("");
              }}
              aria-invalid={!!loginError}
              aria-describedby={loginError ? "login-error" : undefined}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="login-password" className="text-sm text-neutral-400">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              name="password"
              autoComplete="current-password"
              className={inputClass}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setLoginError("");
              }}
              aria-invalid={!!loginError}
              aria-describedby={loginError ? "login-error" : undefined}
            />
          </div>

          {loginError ? (
            <div
              id="login-error"
              className={alertErrorClass}
              role="alert"
              aria-live="polite"
            >
              {loginError}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loginSubmitting}
            className="mt-1 p-3 rounded-md bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:pointer-events-none text-white font-medium transition"
          >
            {loginSubmitting ? "Signing In…" : "Log In"}
          </button>
        </form>
      ) : (
        <form
          id="signup-panel"
          role="tabpanel"
          aria-labelledby="tab-signup"
          onSubmit={handleSignUp}
          className="flex flex-col gap-4"
          noValidate
        >
          <h2 className="text-lg font-semibold text-center text-neutral-100">
            Create an Account
          </h2>

          <div className="flex flex-col gap-1">
            <label htmlFor="signup-email" className="text-sm text-neutral-400">
              Email
            </label>
            <input
              id="signup-email"
              type="email"
              name="signup-email"
              autoComplete="email"
              className={`${inputClass} ${signUpFieldErrors.email ? inputErrorClass : ""}`}
              value={signUpEmail}
              onChange={(e) => {
                setSignUpEmail(e.target.value);
                clearSignUpFieldError("email");
                setSignUpError("");
                setSignUpInfo("");
              }}
              aria-invalid={!!signUpFieldErrors.email}
              aria-describedby={
                signUpFieldErrors.email ? "signup-email-error" : undefined
              }
            />
            {signUpFieldErrors.email ? (
              <p id="signup-email-error" className="text-red-400 text-sm" role="alert">
                {signUpFieldErrors.email}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="signup-display-name" className="text-sm text-neutral-400">
              Display Name
            </label>
            <input
              id="signup-display-name"
              type="text"
              name="display-name"
              autoComplete="nickname"
              maxLength={DISPLAY_NAME_MAX}
              className={`${inputClass} ${signUpFieldErrors.displayName ? inputErrorClass : ""}`}
              value={signUpDisplayName}
              onChange={(e) => {
                setSignUpDisplayName(e.target.value);
                clearSignUpFieldError("displayName");
                setSignUpError("");
                setSignUpInfo("");
              }}
              aria-invalid={!!signUpFieldErrors.displayName}
              aria-describedby={
                signUpFieldErrors.displayName ? "signup-display-error" : undefined
              }
            />
            {signUpFieldErrors.displayName ? (
              <p id="signup-display-error" className="text-red-400 text-sm" role="alert">
                {signUpFieldErrors.displayName}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="signup-password" className="text-sm text-neutral-400">
              Password
            </label>
            <input
              id="signup-password"
              type="password"
              name="signup-password"
              autoComplete="new-password"
              className={`${inputClass} ${signUpFieldErrors.password ? inputErrorClass : ""}`}
              value={signUpPassword}
              onChange={(e) => {
                setSignUpPassword(e.target.value);
                clearSignUpFieldError("password");
                setSignUpError("");
                setSignUpInfo("");
              }}
              aria-invalid={!!signUpFieldErrors.password}
              aria-describedby={
                signUpFieldErrors.password
                  ? "signup-password-error"
                  : "signup-password-hint"
              }
            />
            {signUpFieldErrors.password ? (
              <p id="signup-password-error" className="text-red-400 text-sm" role="alert">
                {signUpFieldErrors.password}
              </p>
            ) : (
              <p id="signup-password-hint" className="text-neutral-500 text-xs">
                At Least {PASSWORD_MIN} Characters (Stricter Rules May Apply on the Server).
              </p>
            )}
          </div>

          {signUpError ? (
            <div className={alertErrorClass} role="alert" aria-live="polite">
              {signUpError}
            </div>
          ) : null}

          {signUpInfo ? (
            <div className={alertInfoClass} role="status" aria-live="polite">
              <p>{signUpInfo}</p>
              <Link
                href="/"
                className="mt-2 inline-block text-sm font-medium text-blue-400 hover:text-blue-300"
              >
                Go to Home
              </Link>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={signUpSubmitting}
            className="mt-1 p-3 rounded-md bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:pointer-events-none text-white font-medium transition"
          >
            {signUpSubmitting ? "Creating Account…" : "Sign Up"}
          </button>
        </form>
      )}
    </div>
  );
}
