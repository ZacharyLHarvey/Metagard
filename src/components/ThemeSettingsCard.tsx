"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Theme = "dark" | "light";

export default function ThemeSettingsCard({ initialTheme }: { initialTheme: Theme }) {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  async function updateTheme(nextTheme: Theme) {
    setTheme(nextTheme);
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme_preference: nextTheme }),
    });
    setSaving(false);
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      setMessage(payload.error ?? "Failed to save theme.");
      return;
    }
    setMessage("Theme updated.");
    router.refresh();
  }

  return (
    <section className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-5 space-y-4">
      <h2 className="text-lg font-semibold">Appearance</h2>
      <div className="space-y-2">
        <p className="text-sm font-medium text-neutral-200">Theme</p>
        <p className="text-sm text-neutral-400">
          Choose between Dark Mode and Light Mode for the entire site.
        </p>
      </div>

      <div className="inline-flex items-center rounded-full border border-neutral-700 p-1 bg-neutral-900">
        <button
          type="button"
          onClick={() => updateTheme("dark")}
          aria-pressed={theme === "dark"}
          className={`px-4 py-1.5 text-sm rounded-full transition ${
            theme === "dark" ? "bg-blue-600 text-white" : "text-neutral-300 hover:bg-neutral-800"
          }`}
        >
          Dark Mode
        </button>
        <button
          type="button"
          onClick={() => updateTheme("light")}
          aria-pressed={theme === "light"}
          className={`px-4 py-1.5 text-sm rounded-full transition ${
            theme === "light" ? "bg-blue-600 text-white" : "text-neutral-300 hover:bg-neutral-800"
          }`}
        >
          Light Mode
        </button>
      </div>

      {saving ? <p className="text-xs text-neutral-400">Saving…</p> : null}
      {!saving && message ? <p className="text-xs text-neutral-400">{message}</p> : null}
    </section>
  );
}
