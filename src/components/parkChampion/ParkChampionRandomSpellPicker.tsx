"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const DEFAULT_SPELL_COUNT = 1;
const MAX_SPELL_COUNT = 500;

type RandomSpellResultRow = {
  id: number;
  name: string;
  type: string | null;
};

/** Omit `type` query params when none checked (treat as all) or all checked (full table incl. blank type). */
function appendTypeFilterParams(
  params: URLSearchParams,
  allTypesFromApi: string[],
  typeChecked: Record<string, boolean>,
) {
  const selected = allTypesFromApi.filter((t) => typeChecked[t]);
  if (selected.length === 0) return;
  if (allTypesFromApi.length > 0 && selected.length === allTypesFromApi.length) return;
  for (const t of selected) params.append("type", t);
}

function formatSpellLine(row: RandomSpellResultRow): string {
  const type = row.type?.trim();
  if (!type) return row.name;
  return `${row.name} — ${type}`;
}

function parseSpellCount(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return DEFAULT_SPELL_COUNT;
  const n = Number(t);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) return null;
  return n;
}

export default function ParkChampionRandomSpellPicker() {
  const [countInput, setCountInput] = useState("");
  const [typeList, setTypeList] = useState<string[]>([]);
  const [typeChecked, setTypeChecked] = useState<Record<string, boolean>>({});
  const [typesLoading, setTypesLoading] = useState(true);
  const [typesError, setTypesError] = useState<string | null>(null);

  const [results, setResults] = useState<RandomSpellResultRow[] | null>(null);
  const [poolSize, setPoolSize] = useState<number | null>(null);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadTypes() {
      setTypesLoading(true);
      setTypesError(null);
      try {
        const res = await fetch("/api/spells/types", { cache: "no-store" });
        const body = (await res.json().catch(() => ({}))) as { types?: string[]; error?: string };
        if (!res.ok) {
          throw new Error(body.error ?? "Failed to load spell types");
        }
        const types = body.types ?? [];
        if (cancelled) return;
        setTypeList(types);
        const init: Record<string, boolean> = {};
        for (const t of types) init[t] = true;
        setTypeChecked(init);
      } catch (e) {
        if (!cancelled) {
          setTypesError(e instanceof Error ? e.message : "Failed to load spell types");
          setTypeList([]);
          setTypeChecked({});
        }
      } finally {
        if (!cancelled) setTypesLoading(false);
      }
    }
    loadTypes();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleType = useCallback((type: string) => {
    setTypeChecked((prev) => ({ ...prev, [type]: !prev[type] }));
  }, []);

  const generate = useCallback(async () => {
    const count = parseSpellCount(countInput);
    if (count == null) {
      setError("Number of spells must be a positive whole number, or leave blank for default.");
      setResults(null);
      setPoolSize(null);
      return;
    }
    if (count > MAX_SPELL_COUNT) {
      setError(`Number of spells is capped at ${MAX_SPELL_COUNT}.`);
      setResults(null);
      setPoolSize(null);
      return;
    }

    setError(null);
    setGenerateLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("count", String(count));
      appendTypeFilterParams(params, typeList, typeChecked);

      const res = await fetch(`/api/spells/random?${params.toString()}`, { cache: "no-store" });
      const body = (await res.json().catch(() => ({}))) as {
        spells?: RandomSpellResultRow[];
        poolSize?: number;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(body.error ?? "Failed to pick random spells");
      }
      setResults(body.spells ?? []);
      setPoolSize(typeof body.poolSize === "number" ? body.poolSize : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to pick random spells");
      setResults(null);
      setPoolSize(null);
    } finally {
      setGenerateLoading(false);
    }
  }, [countInput, typeList, typeChecked]);

  const resultsText = useMemo(() => {
    if (results == null) return "";
    return results.map(formatSpellLine).join("\n");
  }, [results]);

  return (
    <section className="border border-neutral-800 rounded-lg p-5 space-y-4">
      <h2 className="text-lg font-semibold">Random Spell Picker</h2>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1 min-w-[8rem]">
          <label htmlFor="rsp-count" className="text-xs text-neutral-400">
            # of spells{" "}
            <span className="text-neutral-600">({DEFAULT_SPELL_COUNT})</span>
          </label>
          <input
            id="rsp-count"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder={String(DEFAULT_SPELL_COUNT)}
            value={countInput}
            onChange={(e) => setCountInput(e.target.value)}
            className="rounded border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 w-full"
          />
        </div>

        <fieldset className="rounded border border-neutral-700 bg-neutral-900/50 px-3 py-2 min-w-0 flex-1">
          <legend className="text-xs text-neutral-400 px-1">Spell types</legend>
          {typesLoading ? (
            <p className="text-sm text-neutral-400 mt-1">Loading types…</p>
          ) : typeList.length === 0 ? (
            <p className="text-sm text-neutral-400 mt-1">
              No distinct types found{typesError ? "" : " (spells still use the full table)"}.
            </p>
          ) : (
            <div className="flex flex-wrap gap-x-4 gap-y-2 mt-1">
              {typeList.map((type) => (
                <label key={type} className="flex items-center gap-2 text-sm text-neutral-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={typeChecked[type] === true}
                    onChange={() => toggleType(type)}
                    className="rounded border-neutral-600"
                  />
                  {type}
                </label>
              ))}
            </div>
          )}
        </fieldset>

        <button
          type="button"
          onClick={() => void generate()}
          disabled={generateLoading}
          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded text-sm shrink-0"
        >
          {generateLoading ? "…" : "Generate"}
        </button>
      </div>

      {typesError ? <p className="text-sm text-amber-200">Type list: {typesError} — you can still generate from the full spell table.</p> : null}

      <p className="text-xs text-neutral-500">
        Uncheck types to narrow the pool. If none are checked, all types are used. If every listed type is checked, the
        full spell table is used (including spells with no type). Each pick is drawn from the filtered pool
        independently, so duplicate spells are always possible.
      </p>

      {error ? <p className="text-sm text-amber-200">{error}</p> : null}

      {poolSize !== null && results !== null && !generateLoading ? (
        <p className="text-xs text-neutral-500">
          Filtered pool size: {poolSize}
          {poolSize === 0 ? " — no spells match the current type filters." : ""}
        </p>
      ) : null}

      <div className="space-y-2">
        <p className="text-xs font-medium text-neutral-400">Results</p>
        <textarea
          readOnly
          value={resultsText}
          placeholder="Selected spells appear here, one per line — select and copy."
          aria-label="Randomly selected spells"
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
