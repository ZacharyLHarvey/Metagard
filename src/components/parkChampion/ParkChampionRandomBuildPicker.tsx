"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import CreatorAttribution from "@/components/CreatorAttribution";

type RandomBuildResult = {
  id: number;
  name: string;
  class: string;
  level: number;
  lookThePart: boolean;
  ownerId: string | null;
  creatorDisplayName?: string;
  href: string;
};

function formatBuildSubtitle(build: RandomBuildResult): string {
  const parts = [build.class, `L${build.level}`, build.lookThePart ? "Look the Part" : null].filter(Boolean);
  return parts.join(" · ");
}

export default function ParkChampionRandomBuildPicker() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [build, setBuild] = useState<RandomBuildResult | null>(null);
  const [poolSize, setPoolSize] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [nonce, setNonce] = useState(0);

  const [classOptions, setClassOptions] = useState<string[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [classesError, setClassesError] = useState("");

  const group = searchParams.get("group") ?? "all";
  const maxLevel = searchParams.get("maxLevel") ?? "";

  useEffect(() => {
    let cancelled = false;
    async function loadClasses() {
      setClassesLoading(true);
      setClassesError("");
      try {
        const res = await fetch("/api/builds/class-filter-options", { cache: "no-store" });
        const body = (await res.json().catch(() => ({}))) as { classes?: string[]; error?: string };
        if (!res.ok) throw new Error(body.error ?? "Failed to load classes");
        if (cancelled) return;
        setClassOptions(body.classes ?? []);
      } catch (e) {
        if (!cancelled) {
          setClassesError(e instanceof Error ? e.message : "Failed to load classes");
          setClassOptions([]);
        }
      } finally {
        if (!cancelled) setClassesLoading(false);
      }
    }
    loadClasses();
    return () => {
      cancelled = true;
    };
  }, []);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (group && group !== "all") p.set("group", group);
    if (maxLevel) p.set("maxLevel", maxLevel);
    return p.toString();
  }, [group, maxLevel]);

  function setParam(name: string, value: string) {
    const p = new URLSearchParams(searchParams.toString());
    if (!value || (name === "group" && value === "all")) p.delete(name);
    else p.set(name, value);
    router.replace(`${pathname}${p.toString() ? `?${p.toString()}` : ""}`);
  }

  useEffect(() => {
    async function run() {
      setLoading(true);
      setError("");
      const res = await fetch(`/api/builds/random${queryString ? `?${queryString}` : ""}`, { cache: "no-store" });
      setLoading(false);
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Failed to pick random build");
        setBuild(null);
        setPoolSize(0);
        return;
      }
      const body = (await res.json()) as { build: RandomBuildResult | null; poolSize: number };
      setBuild(body.build);
      setPoolSize(typeof body.poolSize === "number" ? body.poolSize : 0);
    }
    run();
  }, [queryString, nonce]);

  return (
    <section className="border border-neutral-800 rounded-lg p-5 space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold">Random Build Picker</h2>
        <button
          type="button"
          onClick={() => setNonce((n) => n + 1)}
          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
        >
          Pick Again
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label htmlFor="rbp-group" className="block text-sm text-neutral-400 mb-1">
            Class filter
          </label>
          <select
            id="rbp-group"
            className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-sm"
            value={group}
            disabled={classesLoading}
            onChange={(e) => setParam("group", e.target.value)}
          >
            <option value="all">All</option>
            {classOptions.map((className) => (
              <option key={className} value={className}>
                {className}
              </option>
            ))}
            <option value="caster">Caster</option>
            <option value="martial">Martial</option>
          </select>
        </div>
        <div>
          <label htmlFor="rbp-max-level" className="block text-sm text-neutral-400 mb-1">
            Max level
          </label>
          <select
            id="rbp-max-level"
            className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-sm"
            value={maxLevel}
            onChange={(e) => setParam("maxLevel", e.target.value)}
          >
            <option value="">Any</option>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={String(n)}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      {classesError ? (
        <p className="text-sm text-amber-200">Class list: {classesError} — All, Caster, and Martial filters still work.</p>
      ) : null}

      <p className="text-xs text-neutral-500">
        Eligible builds after filters: {loading ? "…" : poolSize}. Each pick is independent, so the same build can
        appear again.
      </p>

      {loading ? <p className="text-sm text-neutral-400">Picking a build…</p> : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {!loading && !error && !build ? (
        <p className="text-sm text-neutral-400">No builds match the current filters.</p>
      ) : null}

      {build ? (
        <article className="border border-neutral-800 rounded-lg p-4 space-y-3">
          <h3 className="text-xl font-semibold">
            <Link href={build.href} className="text-blue-400 hover:underline">
              {build.name}
            </Link>
          </h3>
          <p className="text-sm text-neutral-400">{formatBuildSubtitle(build)}</p>
          <CreatorAttribution
            ownerId={build.ownerId}
            displayName={build.creatorDisplayName ?? (build.ownerId ? "Player" : "—")}
          />
        </article>
      ) : null}
    </section>
  );
}
