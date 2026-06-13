"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SpellRefKind } from "@/lib/customClass/types";

export type SpellPickerResult = {
  kind: SpellRefKind;
  id: number;
  name: string;
  type: string | null;
  level: number | null;
};

type Props = {
  value: SpellPickerResult | null;
  onChange: (spell: SpellPickerResult | null) => void;
  label?: string;
};

function queryMatchesSelection(query: string, value: SpellPickerResult | null): boolean {
  if (!value) return false;
  return query.trim().toLowerCase() === value.name.trim().toLowerCase();
}

export default function SpellPicker({ value, onChange, label = "Spell / Ability" }: Props) {
  const valueRef = useRef(value);
  valueRef.current = value;

  const [query, setQuery] = useState(value?.name ?? "");
  const [results, setResults] = useState<SpellPickerResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (value?.name) setQuery(value.name);
  }, [value?.name]);

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    const selected = valueRef.current;
    if (trimmed.length < 2) {
      setResults([]);
      setSearchError("");
      setSearched(false);
      setOpen(false);
      return;
    }
    setLoading(true);
    setSearchError("");
    try {
      const res = await fetch(`/api/spells/search?q=${encodeURIComponent(trimmed)}&limit=15`);
      const body = (await res.json()) as { items?: SpellPickerResult[]; error?: string };
      if (!res.ok) {
        setResults([]);
        setSearchError(body.error ?? "Search failed");
        setSearched(true);
        setOpen(false);
        return;
      }
      const items = body.items ?? [];
      setResults(items);
      setSearched(true);
      setOpen(!queryMatchesSelection(trimmed, selected) && items.length > 0);
    } catch {
      setResults([]);
      setSearchError("Search failed");
      setSearched(true);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void runSearch(query);
    }, 250);
    return () => clearTimeout(timer);
  }, [query, runSearch]);

  function pick(spell: SpellPickerResult) {
    onChange(spell);
    setQuery(spell.name);
    setOpen(false);
    setResults([]);
    setSearched(false);
    setSearchError("");
  }

  function handleFocus() {
    if (queryMatchesSelection(query, value)) return;
    const trimmed = query.trim();
    if (trimmed.length >= 2 && results.length === 0 && !loading && !searched) {
      void runSearch(trimmed);
    } else if (results.length > 0 || (searched && trimmed.length >= 2)) {
      setOpen(true);
    }
  }

  const trimmedQuery = query.trim();
  const showEmpty =
    open && searched && !loading && !searchError && results.length === 0 && trimmedQuery.length >= 2;

  return (
    <div className="space-y-1">
      <label className="block text-sm text-neutral-400 mb-1">{label}</label>
      <input
        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setSearched(false);
          if (value && e.target.value !== value.name) onChange(null);
        }}
        onFocus={handleFocus}
        placeholder="Search canonical or custom spells…"
      />
      {value ? (
        <p className="text-xs text-neutral-500">
          Selected: {value.name} ({value.kind === "custom" ? "Custom" : "Canonical"})
        </p>
      ) : null}
      {open && results.length > 0 ? (
        <ul className="mt-1 w-full max-h-48 overflow-y-auto rounded border border-neutral-700 bg-neutral-900 shadow-lg">
          {results.map((r) => (
            <li key={`${r.kind}-${r.id}`}>
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-800"
                onClick={() => pick(r)}
              >
                {r.name}{" "}
                <span className="text-neutral-500">
                  ({r.kind === "custom" ? "Custom" : "Canonical"}
                  {r.type ? ` · ${r.type}` : ""})
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {showEmpty ? (
        <p className="text-xs text-neutral-500">No spells found for &ldquo;{trimmedQuery}&rdquo;</p>
      ) : null}
      {loading ? <p className="text-xs text-neutral-500">Searching…</p> : null}
      {searchError ? <p className="text-xs text-red-400">{searchError}</p> : null}
    </div>
  );
}
