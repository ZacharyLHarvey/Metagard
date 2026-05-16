"use client";

import { useMemo, useState } from "react";

const DEFAULT_WEAPON_COUNT = 1;
const MAX_WEAPON_COUNT = 500;

export const WEAPON_CATEGORIES = ["Melee", "Ranged", "Magic", "Other", "Funny"] as const;
export type WeaponCategory = (typeof WEAPON_CATEGORIES)[number];

export const WEAPON_POOLS: Record<WeaponCategory, readonly string[]> = {
  Melee: ["Dagger", "Short", "Long", "Flail", "Great", "Madu"],
  Ranged: ["Light Thrown", "Heavy Thrown", "Rock", "Javelin", "Bow"],
  Magic: [
    "Abeyance",
    "Entangle",
    "Fireball",
    "Force Bolt",
    "Iceball",
    "Lightning Bolt",
    "Phase Bolt",
    "Sphere of Annihilation",
    "Suppression Bolt",
  ],
  Other: ["Small Shield", "Medium Shield", "Large Shield", "Magic Staff"],
  Funny: [
    "Taco",
    "Squire",
    "Siege",
    "Blessing Against Wounds",
    "Iron Skin",
    "Lump of Coal",
    "Spin Shots Only",
    "Off Hand Only",
    "Drink",
    "Shove",
    "Pick [Melee]",
    "Pick [Ranged]",
    "Pick [Magic]",
    "Pick [Other]",
    "Pick [Funny]",
  ],
};

function buildFilteredPool(activeCategories: Set<WeaponCategory>): string[] {
  const pool: string[] = [];
  for (const cat of WEAPON_CATEGORIES) {
    if (!activeCategories.has(cat)) continue;
    pool.push(...WEAPON_POOLS[cat]);
  }
  return pool;
}

function pickRandomWeaponsWithReplacement(pool: string[], count: number): string[] {
  if (pool.length === 0) return [];
  const out: string[] = [];
  // Each pick is independent from the full pool — duplicates are always possible.
  for (let i = 0; i < count; i += 1) {
    out.push(pool[Math.floor(Math.random() * pool.length)]!);
  }
  return out;
}

function parseWeaponCount(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return DEFAULT_WEAPON_COUNT;
  const n = Number(t);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) return null;
  return n;
}

export default function ParkChampionRandomWeaponPicker() {
  const [countInput, setCountInput] = useState("");
  const [categoryChecked, setCategoryChecked] = useState<Record<WeaponCategory, boolean>>(() => {
    const init = {} as Record<WeaponCategory, boolean>;
    for (const c of WEAPON_CATEGORIES) init[c] = true;
    return init;
  });
  const [results, setResults] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeCategories = useMemo(() => {
    const selected = new Set<WeaponCategory>();
    for (const c of WEAPON_CATEGORIES) {
      if (categoryChecked[c]) selected.add(c);
    }
    if (selected.size === 0) {
      return new Set<WeaponCategory>(WEAPON_CATEGORIES);
    }
    return selected;
  }, [categoryChecked]);

  function toggleCategory(cat: WeaponCategory) {
    setCategoryChecked((prev) => ({ ...prev, [cat]: !prev[cat] }));
  }

  function generate() {
    const count = parseWeaponCount(countInput);
    if (count == null) {
      setError("Number of weapons must be a positive whole number, or leave blank for default.");
      return;
    }
    if (count > MAX_WEAPON_COUNT) {
      setError(`Number of weapons is capped at ${MAX_WEAPON_COUNT}.`);
      return;
    }

    const pool = buildFilteredPool(activeCategories);
    if (pool.length === 0) {
      setError("No weapons in the selected categories.");
      return;
    }

    setError(null);
    setResults(pickRandomWeaponsWithReplacement(pool, count));
  }

  const resultsText = results == null ? "" : results.join("\n");

  return (
    <section className="border border-neutral-800 rounded-lg p-5 space-y-4">
      <h2 className="text-lg font-semibold">Random Weapon Picker</h2>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1 min-w-[8rem]">
          <label htmlFor="rwp-count" className="text-xs text-neutral-400">
            # of weapons{" "}
            <span className="text-neutral-600">({DEFAULT_WEAPON_COUNT})</span>
          </label>
          <input
            id="rwp-count"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder={String(DEFAULT_WEAPON_COUNT)}
            value={countInput}
            onChange={(e) => setCountInput(e.target.value)}
            className="rounded border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 w-full"
          />
        </div>

        <fieldset className="rounded border border-neutral-700 bg-neutral-900/50 px-3 py-2 min-w-0">
          <legend className="text-xs text-neutral-400 px-1">Categories</legend>
          <div className="flex flex-wrap gap-x-4 gap-y-2 mt-1">
            {WEAPON_CATEGORIES.map((cat) => (
              <label key={cat} className="flex items-center gap-2 text-sm text-neutral-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={categoryChecked[cat]}
                  onChange={() => toggleCategory(cat)}
                  className="rounded border-neutral-600"
                />
                {cat}
              </label>
            ))}
          </div>
        </fieldset>

        <button
          type="button"
          onClick={generate}
          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm shrink-0"
        >
          Generate
        </button>
      </div>

      <p className="text-xs text-neutral-500">
        Uncheck categories to narrow the pool. If none are checked, all categories are used. Each pick is drawn from
        the full pool independently, so duplicate weapons are always possible.
      </p>

      {error ? <p className="text-sm text-amber-200">{error}</p> : null}

      <div className="space-y-2">
        <p className="text-xs font-medium text-neutral-400">Results</p>
        <textarea
          readOnly
          value={resultsText}
          placeholder="Selected weapons appear here, one per line — select and copy."
          aria-label="Randomly selected weapons"
          className={[
            "w-full min-h-[7rem] rounded-lg border border-neutral-800 p-4",
            "bg-neutral-900/40 text-sm text-neutral-100",
            "whitespace-pre-wrap resize-y select-all",
          ].join(" ")}
          onFocus={(e) => e.target.select()}
        />
      </div>
    </section>
  );
}
