"use client";

import { useState } from "react";

const INCREMENT_SEC = 30;
const DEFAULT_MIN_DISPLAY = "00:30";
const DEFAULT_MAX_DISPLAY = "05:00";
const DEFAULT_INTERVAL_COUNT = 1;
const MAX_INTERVAL_COUNT = 500;

function parseMmSsToSeconds(raw: string): number | null {
  const t = raw.trim();
  const m = t.match(/^(\d+):(\d{1,2})$/);
  if (!m) return null;
  const minutes = Number(m[1]);
  const seconds = Number(m[2]);
  if (
    !Number.isInteger(minutes) ||
    minutes < 0 ||
    !Number.isInteger(seconds) ||
    seconds < 0 ||
    seconds > 59
  ) {
    return null;
  }
  return minutes * 60 + seconds;
}

function secondsToMmSs(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Round to nearest 30-second boundary (0, 30, 60, …). */
function normalizeTo30SecondIncrement(seconds: number): number {
  return Math.round(seconds / INCREMENT_SEC) * INCREMENT_SEC;
}

const DEFAULT_MIN_SECONDS = parseMmSsToSeconds(DEFAULT_MIN_DISPLAY) ?? 30;
const DEFAULT_MAX_SECONDS = parseMmSsToSeconds(DEFAULT_MAX_DISPLAY) ?? 300;

function parseOptionalMmSsSeconds(raw: string, fallbackSeconds: number): number | null {
  const t = raw.trim();
  if (t === "") return fallbackSeconds;
  return parseMmSsToSeconds(t);
}

/** Blank uses fallback; else require finite integer ≥ 1. */
function parseOptionalPositiveInt(raw: string, fallback: number): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return fallback;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) return null;
  return n;
}

/** Inclusive multiples of 30 between min and max (both already normalized). */
function discreteIntervalSecondsInclusive(minSeconds: number, maxSeconds: number): number[] {
  const steps: number[] = [];
  for (let sec = minSeconds; sec <= maxSeconds; sec += INCREMENT_SEC) {
    steps.push(sec);
  }
  return steps;
}

function pickRandomFrom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

export default function ParkChampionRandomTimeIntervalPicker() {
  const [minInput, setMinInput] = useState("");
  const [maxInput, setMaxInput] = useState("");
  const [countInput, setCountInput] = useState("");
  const [results, setResults] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function generate() {
    const minBase = parseOptionalMmSsSeconds(minInput, DEFAULT_MIN_SECONDS);
    const maxBase = parseOptionalMmSsSeconds(maxInput, DEFAULT_MAX_SECONDS);
    const countRaw = parseOptionalPositiveInt(countInput, DEFAULT_INTERVAL_COUNT);

    if (minBase == null || maxBase == null) {
      setError('Use MM:SS (e.g. 00:30, 05:00), or leave blank for defaults.');
      return;
    }
    if (countRaw == null) {
      setError("Number of intervals must be a positive whole number, or leave blank for default.");
      return;
    }
    if (countRaw > MAX_INTERVAL_COUNT) {
      setError(`Number of intervals is capped at ${MAX_INTERVAL_COUNT}.`);
      return;
    }

    const minNorm = normalizeTo30SecondIncrement(minBase);
    const maxNorm = normalizeTo30SecondIncrement(maxBase);

    if (minNorm > maxNorm) {
      setError("Min interval must be less than or equal to Max (after rounding to 30-second steps).");
      return;
    }

    const steps = discreteIntervalSecondsInclusive(minNorm, maxNorm);
    if (steps.length === 0) {
      setError("No valid 30-second intervals in that range.");
      return;
    }

    const out: string[] = [];
    for (let i = 0; i < countRaw; i += 1) {
      const sec = pickRandomFrom(steps);
      out.push(secondsToMmSs(sec));
    }

    setError(null);
    setResults(out);
  }

  const resultsText =
    results == null ? "" : results.join("\n");

  return (
    <section className="border border-neutral-800 rounded-lg p-5 space-y-4">
      <h2 className="text-lg font-semibold">Random Time Interval Picker</h2>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1 min-w-[6.5rem]">
          <label htmlFor="rti-min" className="text-xs text-neutral-400">
            Min interval{" "}
            <span className="text-neutral-600">({DEFAULT_MIN_DISPLAY})</span>
          </label>
          <input
            id="rti-min"
            type="text"
            inputMode="text"
            autoComplete="off"
            placeholder={DEFAULT_MIN_DISPLAY}
            value={minInput}
            onChange={(e) => setMinInput(e.target.value)}
            className="rounded border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 w-full font-mono"
          />
        </div>
        <div className="flex flex-col gap-1 min-w-[6.5rem]">
          <label htmlFor="rti-max" className="text-xs text-neutral-400">
            Max interval{" "}
            <span className="text-neutral-600">({DEFAULT_MAX_DISPLAY})</span>
          </label>
          <input
            id="rti-max"
            type="text"
            inputMode="text"
            autoComplete="off"
            placeholder={DEFAULT_MAX_DISPLAY}
            value={maxInput}
            onChange={(e) => setMaxInput(e.target.value)}
            className="rounded border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 w-full font-mono"
          />
        </div>
        <div className="flex flex-col gap-1 min-w-[5.5rem]">
          <label htmlFor="rti-count" className="text-xs text-neutral-400">
            # of intervals{" "}
            <span className="text-neutral-600">({DEFAULT_INTERVAL_COUNT})</span>
          </label>
          <input
            id="rti-count"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder={String(DEFAULT_INTERVAL_COUNT)}
            value={countInput}
            onChange={(e) => setCountInput(e.target.value)}
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

      <p className="text-xs text-neutral-500">
        Intervals use 30-second steps. Values are rounded to the nearest step when needed.
      </p>

      {error ? <p className="text-sm text-amber-200">{error}</p> : null}

      <div className="space-y-2">
        <p className="text-xs font-medium text-neutral-400">Results</p>
        <textarea
          readOnly
          value={resultsText}
          placeholder="Each generated interval appears on its own line — select and copy."
          aria-label="Generated random time intervals"
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
