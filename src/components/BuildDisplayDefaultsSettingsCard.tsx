"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type {
  BuildEditDefaults,
  BuildViewDefaults,
} from "@/lib/spellbook/buildDisplayDefaults";

type Props = {
  initialViewDefaults: BuildViewDefaults;
  initialEditDefaults: BuildEditDefaults;
};

export default function BuildDisplayDefaultsSettingsCard({
  initialViewDefaults,
  initialEditDefaults,
}: Props) {
  const [viewDefaults, setViewDefaults] = useState(initialViewDefaults);
  const [editDefaults, setEditDefaults] = useState(initialEditDefaults);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  async function saveViewDefaults(next: BuildViewDefaults) {
    setViewDefaults(next);
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ build_view_defaults: next }),
    });
    setSaving(false);
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      setMessage(payload.error ?? "Failed to save view build defaults.");
      setViewDefaults(initialViewDefaults);
      return;
    }
    setMessage("View build defaults updated.");
    router.refresh();
  }

  async function saveEditDefaults(next: BuildEditDefaults) {
    setEditDefaults(next);
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ build_edit_defaults: next }),
    });
    setSaving(false);
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      setMessage(payload.error ?? "Failed to save edit build defaults.");
      setEditDefaults(initialEditDefaults);
      return;
    }
    setMessage("Edit build defaults updated.");
    router.refresh();
  }

  function updateViewCheckbox(key: keyof Omit<BuildViewDefaults, "display">, checked: boolean) {
    void saveViewDefaults({ ...viewDefaults, [key]: checked });
  }

  function updateEditCheckbox(key: keyof BuildEditDefaults, checked: boolean) {
    void saveEditDefaults({ ...editDefaults, [key]: checked });
  }

  return (
    <section className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-5 space-y-6">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Build Spell Display</h2>
        <p className="text-sm text-neutral-400">
          Set default display options for view and edit build pages. You can still change these per
          visit using the controls on each build page.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-medium text-neutral-200">View Build Defaults</h3>
        <div className="rounded border border-neutral-800 p-3 bg-neutral-900/40">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={viewDefaults.showTypeSchool}
                  onChange={(e) => updateViewCheckbox("showTypeSchool", e.target.checked)}
                />
                Show Type/School
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={viewDefaults.showIncantation}
                  onChange={(e) => updateViewCheckbox("showIncantation", e.target.checked)}
                />
                Show Incantation
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={viewDefaults.showMaterials}
                  onChange={(e) => updateViewCheckbox("showMaterials", e.target.checked)}
                />
                Show Materials
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={viewDefaults.showRange}
                  onChange={(e) => updateViewCheckbox("showRange", e.target.checked)}
                />
                Show Range
              </label>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="view-display-default" className="text-sm text-neutral-400">
                Display
              </label>
              <select
                id="view-display-default"
                value={viewDefaults.display}
                onChange={(e) =>
                  void saveViewDefaults({
                    ...viewDefaults,
                    display: e.target.value as BuildViewDefaults["display"],
                  })
                }
                className="px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-sm"
              >
                <option value="level">Level</option>
                <option value="type">Type</option>
                <option value="school">School</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-medium text-neutral-200">Edit Build Defaults</h3>
        <div className="rounded border border-neutral-800 p-3 bg-neutral-900/40">
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={editDefaults.showTypeSchool}
                onChange={(e) => updateEditCheckbox("showTypeSchool", e.target.checked)}
              />
              Show Type/School
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={editDefaults.showIncantation}
                onChange={(e) => updateEditCheckbox("showIncantation", e.target.checked)}
              />
              Show Incantation
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={editDefaults.showMaterials}
                onChange={(e) => updateEditCheckbox("showMaterials", e.target.checked)}
              />
              Show Materials
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={editDefaults.showRange}
                onChange={(e) => updateEditCheckbox("showRange", e.target.checked)}
              />
              Show Range
            </label>
          </div>
        </div>
      </div>

      {saving ? <p className="text-xs text-neutral-400">Saving…</p> : null}
      {!saving && message ? <p className="text-xs text-neutral-400">{message}</p> : null}
    </section>
  );
}
