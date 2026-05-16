"use client";

import { useMemo, useState } from "react";

const DEFAULT_CLASS_COUNT = 1;
const MAX_CLASS_COUNT = 500;

export const CLASS_CATEGORIES = ["Martial", "Caster", "Monster Included"] as const;
export type ClassCategory = (typeof CLASS_CATEGORIES)[number];

export const CLASS_POOLS: Record<ClassCategory, readonly string[]> = {
  Martial: [
    "Anti-Paladin",
    "Archer",
    "Assassin",
    "Barbarian",
    "Monk",
    "Paladin",
    "Scout",
    "Warrior",
  ],
  Caster: ["Bard", "Druid", "Healer", "Wizard"],
  "Monster Included": ["Monster"],
};

function buildFilteredClassPool(activeCategories: Set<ClassCategory>): string[] {
  const pool: string[] = [];
  for (const cat of CLASS_CATEGORIES) {
    if (!activeCategories.has(cat)) continue;
    pool.push(...CLASS_POOLS[cat]);
  }
  return pool;
}

/** Each pick is independent from the full pool — duplicates are always possible. */
function pickRandomClassesWithReplacement(pool: string[], count: number): string[] {
  if (pool.length === 0) return [];
  const out: string[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push(pool[Math.floor(Math.random() * pool.length)]!);
  }
  return out;
}

function parseClassCount(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return DEFAULT_CLASS_COUNT;
  const n = Number(t);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) return null;
  return n;
}

export default function ParkChampionRandomClassPicker() {
  const [countInput, setCountInput] = useState("");
  const [categoryChecked, setCategoryChecked] = useState<Record<ClassCategory, boolean>>(() => {
    const init = {} as Record<ClassCategory, boolean>;
    for (const c of CLASS_CATEGORIES) init[c] = true;
    return init;
  });
  const [results, setResults] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeCategories = useMemo(() => {
    const selected = new Set<ClassCategory>();
    for (const c of CLASS_CATEGORIES) {
      if (categoryChecked[c]) selected.add(c);
    }
    if (selected.size === 0) {
      return new Set<ClassCategory>(CLASS_CATEGORIES);
    }
    return selected;
  }, [categoryChecked]);

  function toggleCategory(cat: ClassCategory) {
    setCategoryChecked((prev) => ({ ...prev, [cat]: !prev[cat] }));
  }

  function generate() {
    const count = parseClassCount(countInput);
    if (count == null) {
      setError("Number of classes must be a positive whole number, or leave blank for default.");
      return;
    }
    if (count > MAX_CLASS_COUNT) {
      setError(`Number of classes is capped at ${MAX_CLASS_COUNT}.`);
      return;
    }

    const pool = buildFilteredClassPool(activeCategories);
    if (pool.length === 0) {
      setError("No classes in the selected categories.");
      return;
    }

    setError(null);
    setResults(pickRandomClassesWithReplacement(pool, count));
  }

  const resultsText = results == null ? "" : results.join("\n");

  return (
    <section className="border border-neutral-800 rounded-lg p-5 space-y-4">
      <h2 className="text-lg font-semibold">Random Class Picker</h2>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1 min-w-[8rem]">
          <label htmlFor="rcp-count" className="text-xs text-neutral-400">
            # of classes{" "}
            <span className="text-neutral-600">({DEFAULT_CLASS_COUNT})</span>
          </label>
          <input
            id="rcp-count"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder={String(DEFAULT_CLASS_COUNT)}
            value={countInput}
            onChange={(e) => setCountInput(e.target.value)}
            className="rounded border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 w-full"
          />
        </div>

        <fieldset className="rounded border border-neutral-700 bg-neutral-900/50 px-3 py-2 min-w-0">
          <legend className="text-xs text-neutral-400 px-1">Categories</legend>
          <div className="flex flex-wrap gap-x-4 gap-y-2 mt-1">
            {CLASS_CATEGORIES.map((cat) => (
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
        the full pool independently, so duplicate classes are always possible.
      </p>

      {error ? <p className="text-sm text-amber-200">{error}</p> : null}

      <div className="space-y-2">
        <p className="text-xs font-medium text-neutral-400">Results</p>
        <textarea
          readOnly
          value={resultsText}
          placeholder="Selected classes appear here, one per line — select and copy."
          aria-label="Randomly selected classes"
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
