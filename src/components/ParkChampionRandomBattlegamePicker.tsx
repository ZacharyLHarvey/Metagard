"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BATTLEGAME_TYPES } from "@/lib/battlegames";

type BattlegameRow = {
  id: number;
  name: string;
  game_type?: string | null;
  description?: string | null;
  lives?: string | null;
  respawn?: string | null;
  base?: string | null;
  teams?: string | null;
  objectives?: string | null;
  refresh?: string | null;
  scenario_rules?: string | null;
  image_url?: string | null;
  min_players?: number | null;
  max_players?: number | null;
  min_teams?: number | null;
  max_teams?: number | null;
};

export default function ParkChampionRandomBattlegamePicker() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [item, setItem] = useState<BattlegameRow | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [nonce, setNonce] = useState(0);

  const gameType = searchParams.get("gameType") ?? "All";
  const players = searchParams.get("players") ?? "";
  const teams = searchParams.get("teams") ?? "";
  const [playersInput, setPlayersInput] = useState(players);
  const [teamsInput, setTeamsInput] = useState(teams);

  useEffect(() => setPlayersInput(players), [players]);
  useEffect(() => setTeamsInput(teams), [teams]);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (gameType && gameType !== "All") p.set("gameType", gameType);
    if (players) p.set("players", players);
    if (teams) p.set("teams", teams);
    return p.toString();
  }, [gameType, players, teams]);

  function setParam(name: string, value: string) {
    const p = new URLSearchParams(searchParams.toString());
    if (!value || (name === "gameType" && value === "All")) p.delete(name);
    else p.set(name, value);
    router.replace(`${pathname}${p.toString() ? `?${p.toString()}` : ""}`);
  }

  function commitNumeric(name: "players" | "teams", value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      setParam(name, "");
      return;
    }
    const num = Number(trimmed);
    if (!Number.isFinite(num) || num < 1 || !Number.isInteger(num)) return;
    setParam(name, String(num));
  }

  useEffect(() => {
    async function run() {
      setLoading(true);
      setError("");
      const res = await fetch(`/api/battlegames/random${queryString ? `?${queryString}` : ""}`, { cache: "no-store" });
      setLoading(false);
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Failed to load random battlegame");
        setItem(null);
        setTotal(0);
        return;
      }
      const body = (await res.json()) as { item: BattlegameRow | null; total: number };
      setItem(body.item);
      setTotal(body.total);
    }
    run();
  }, [queryString, nonce]);

  return (
    <section className="border border-neutral-800 rounded-lg p-5 space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold">Random Battlegame Picker</h2>
        <button onClick={() => setNonce((n) => n + 1)} className="px-3 py-2 bg-blue-600 rounded text-sm">
          Pick Again
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm text-neutral-400 mb-1">Ruleset</label>
          <select
            className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-sm"
            value={gameType}
            onChange={(e) => setParam("gameType", e.target.value)}
          >
            {BATTLEGAME_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-neutral-400 mb-1">Number of Players</label>
          <input
            className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-sm"
            inputMode="numeric"
            value={playersInput}
            onChange={(e) => setPlayersInput(e.target.value)}
            onBlur={() => commitNumeric("players", playersInput)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitNumeric("players", playersInput);
              }
            }}
          />
        </div>
        <div>
          <label className="block text-sm text-neutral-400 mb-1">Number of Teams</label>
          <input
            className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-sm"
            inputMode="numeric"
            value={teamsInput}
            onChange={(e) => setTeamsInput(e.target.value)}
            onBlur={() => commitNumeric("teams", teamsInput)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitNumeric("teams", teamsInput);
              }
            }}
          />
        </div>
      </div>

      <p className="text-xs text-neutral-500">Eligible battlegames from Supabase after filters: {total}</p>

      {loading ? <p className="text-sm text-neutral-400">Picking a battlegame…</p> : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {!loading && !error && !item ? (
        <p className="text-sm text-neutral-400">No battlegames match the current filters.</p>
      ) : null}

      {item ? (
        <article className="border border-neutral-800 rounded-lg p-4 space-y-3">
          <h3 className="text-xl font-semibold">{item.name}</h3>
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.name}
              className="w-full max-h-80 object-contain rounded border border-neutral-800"
            />
          ) : null}
          <div className="grid md:grid-cols-2 gap-2 text-sm">
            <p><span className="text-neutral-400">Ruleset:</span> {item.game_type ?? "—"}</p>
            <p><span className="text-neutral-400">Players:</span> {item.min_players ?? "?"}{item.max_players != null ? `-${item.max_players}` : "+"}</p>
            <p><span className="text-neutral-400">Teams:</span> {item.min_teams ?? "?"}{item.max_teams != null ? `-${item.max_teams}` : "+"}</p>
            {item.lives ? <p><span className="text-neutral-400">Lives:</span> {item.lives}</p> : null}
            {item.respawn ? <p><span className="text-neutral-400">Respawn:</span> {item.respawn}</p> : null}
            {item.base ? <p><span className="text-neutral-400">Base:</span> {item.base}</p> : null}
            {item.teams ? <p><span className="text-neutral-400">Team Notes:</span> {item.teams}</p> : null}
            {item.refresh ? <p><span className="text-neutral-400">Refresh:</span> {item.refresh}</p> : null}
          </div>
          {item.objectives ? <p className="text-sm whitespace-pre-wrap"><span className="text-neutral-400">Objectives: </span>{item.objectives}</p> : null}
          {item.scenario_rules ? <p className="text-sm whitespace-pre-wrap"><span className="text-neutral-400">Scenario Rules: </span>{item.scenario_rules}</p> : null}
          {item.description ? <p className="text-sm whitespace-pre-wrap text-neutral-300">{item.description}</p> : null}
        </article>
      ) : null}
    </section>
  );
}
