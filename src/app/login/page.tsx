"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/browser/supabaseBrowser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const supabase = supabaseBrowser();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      return;
    }

    // Session cookie is now set — redirect to homepage
    window.location.href = "/";
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-neutral-950 text-white">
      <form
        onSubmit={handleLogin}
        className="flex flex-col gap-4 w-full max-w-sm p-6 bg-neutral-900 rounded-lg shadow-lg"
      >
        <h1 className="text-xl font-semibold text-center">Log In</h1>

        <input
          type="email"
          placeholder="Email"
          className="p-3 rounded bg-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          className="p-3 rounded bg-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button
          type="submit"
          className="p-3 bg-blue-600 hover:bg-blue-700 rounded text-white font-medium transition"
        >
          Log In
        </button>

        {error && <p className="text-red-400 text-center">{error}</p>}
      </form>
    </main>
  );
}
