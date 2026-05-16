"use client";

import { useState } from "react";

const DEFAULT_MIN = 1;
const DEFAULT_MAX = 100;
const DEFAULT_QUANTITY = 1;
const MAX_QUANTITY = 500;

/** Blank input uses fallback; otherwise require finite integer ≥ 1. */
function parseOptionalPositiveInt(raw: string, fallback: number): number | null {
  const t = raw.trim();
  if (t === "") return fallback;
  const n = Number(t);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) return null;
  return n;
}

function randomIntegerInclusive(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateRandomIntegers(min: number, max: number, count: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push(randomIntegerInclusive(min, max));
  }
  return out;
}

export default function ParkChampionRandomNumberGenerator() {
  const [minInput, setMinInput] = useState("");
  const [maxInput, setMaxInput] = useState("");
  const [quantityInput, setQuantityInput] = useState("");
  const [results, setResults] = useState<number[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function generate() {
    const minParsed = parseOptionalPositiveInt(minInput, DEFAULT_MIN);
    const maxParsed = parseOptionalPositiveInt(maxInput, DEFAULT_MAX);
    const qtyParsed = parseOptionalPositiveInt(quantityInput, DEFAULT_QUANTITY);

    if (minParsed == null || maxParsed == null || qtyParsed == null) {
      setError("Enter valid whole numbers greater than zero, or leave blank for defaults.");
      return;
    }

    let qty = qtyParsed;
    if (qty > MAX_QUANTITY) {
      setError(`Quantity is capped at ${MAX_QUANTITY}.`);
      return;
    }

    if (minParsed > maxParsed) {
      setError("Min must be less than or equal to Max.");
      return;
    }

    setError(null);
    setResults(generateRandomIntegers(minParsed, maxParsed, qty));
  }

  const resultsText =
    results == null ? "" : results.map((n) => String(n)).join(", ");

  return (
    <section className="border border-neutral-800 rounded-lg p-5 space-y-4">
      <h2 className="text-lg font-semibold">Random Number Generator</h2>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1 min-w-[5.5rem]">
          <label htmlFor="rng-min" className="text-xs text-neutral-400">
            Min{" "}
            <span className="text-neutral-600">({DEFAULT_MIN})</span>
          </label>
          <input
            id="rng-min"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder={String(DEFAULT_MIN)}
            value={minInput}
            onChange={(e) => setMinInput(e.target.value)}
            className="rounded border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 w-full"
          />
        </div>
        <div className="flex flex-col gap-1 min-w-[5.5rem]">
          <label htmlFor="rng-max" className="text-xs text-neutral-400">
            Max{" "}
            <span className="text-neutral-600">({DEFAULT_MAX})</span>
          </label>
          <input
            id="rng-max"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder={String(DEFAULT_MAX)}
            value={maxInput}
            onChange={(e) => setMaxInput(e.target.value)}
            className="rounded border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 w-full"
          />
        </div>
        <div className="flex flex-col gap-1 min-w-[5.5rem]">
          <label htmlFor="rng-qty" className="text-xs text-neutral-400">
            Quantity{" "}
            <span className="text-neutral-600">({DEFAULT_QUANTITY})</span>
          </label>
          <input
            id="rng-qty"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder={String(DEFAULT_QUANTITY)}
            value={quantityInput}
            onChange={(e) => setQuantityInput(e.target.value)}
            className="rounded border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 w-full"
          />
        </div>
        <button
          type="button"
          onClick={generate}
          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm shrink-0"
        >
          Generate
        </button>
      </div>

      {error ? <p className="text-sm text-amber-200">{error}</p> : null}

      <div className="space-y-2">
        <p className="text-xs font-medium text-neutral-400">Results</p>
        <textarea
          readOnly
          value={results == null ? "" : resultsText}
          placeholder="Generated numbers appear here — select and copy."
          aria-label="Generated random numbers"
          className={[
            "w-full min-h-[7rem] rounded-lg border border-neutral-800 p-4",
            "bg-neutral-900/40 font-mono text-sm tabular-nums tracking-wide",
            "text-neutral-100 whitespace-pre-wrap resize-y select-all",
          ].join(" ")}
          onFocus={(e) => e.target.select()}
        />
      </div>
    </section>
  );
}
