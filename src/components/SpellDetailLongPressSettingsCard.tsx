"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SpellDetailLongPressSettingsCard({
  initialLongPressEnabled,
}: {
  initialLongPressEnabled: boolean;
}) {
  const [longPressEnabled, setLongPressEnabled] = useState(initialLongPressEnabled);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  async function updateLongPress(next: boolean) {
    setLongPressEnabled(next);
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spell_detail_long_press_enabled: next }),
    });
    setSaving(false);
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      setMessage(payload.error ?? "Failed to Save Spell Detail Long Press Preference.");
      return;
    }
    setMessage("Spell Detail Long Press Preference Updated.");
    router.refresh();
  }

  return (
    <section className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-5 space-y-4">
      <h2 className="text-lg font-semibold">Spell Detail Long Press</h2>
      <div className="space-y-2">
        <p className="text-sm font-medium text-neutral-200">Long Press for Spell Details</p>
        <p className="text-sm text-neutral-400">
          Enable or Disable Long-Press to Open Spell Details on Build and Sideboard Views. The Setting
          Applies Wherever You Are Signed in.
        </p>
      </div>

      <div className="inline-flex items-center rounded-full border border-neutral-700 p-1 bg-neutral-900">
        <button
          type="button"
          onClick={() => updateLongPress(true)}
          aria-pressed={longPressEnabled}
          className={`px-4 py-1.5 text-sm rounded-full transition ${
            longPressEnabled ? "bg-blue-600 text-white" : "text-neutral-300 hover:bg-neutral-800"
          }`}
        >
          On
        </button>
        <button
          type="button"
          onClick={() => updateLongPress(false)}
          aria-pressed={!longPressEnabled}
          className={`px-4 py-1.5 text-sm rounded-full transition ${
            !longPressEnabled ? "bg-blue-600 text-white" : "text-neutral-300 hover:bg-neutral-800"
          }`}
        >
          Off
        </button>
      </div>

      {saving ? <p className="text-xs text-neutral-400">Saving…</p> : null}
      {!saving && message ? <p className="text-xs text-neutral-400">{message}</p> : null}
    </section>
  );
}
