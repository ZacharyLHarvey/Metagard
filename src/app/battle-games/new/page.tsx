"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BATTLEGAME_TYPES_WITHOUT_ALL } from "@/lib/battlegames";

export default function NewBattleGamePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [gameType, setGameType] = useState("Full-Class");
  const [lives, setLives] = useState("");
  const [respawn, setRespawn] = useState("");
  const [base, setBase] = useState("");
  const [teams, setTeams] = useState("");
  const [minPlayers, setMinPlayers] = useState("");
  const [maxPlayers, setMaxPlayers] = useState("");
  const [minTeams, setMinTeams] = useState("");
  const [maxTeams, setMaxTeams] = useState("");
  const [objectives, setObjectives] = useState("");
  const [refresh, setRefresh] = useState("");
  const [scenarioRules, setScenarioRules] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    let imageUrl: string | null = null;
    if (file) {
      const form = new FormData();
      form.append("entity", "battlegames");
      form.append("file", file);
      const uploadRes = await fetch("/api/uploads/image", { method: "POST", body: form });
      if (!uploadRes.ok) {
        const body = (await uploadRes.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Image upload failed");
        setBusy(false);
        return;
      }
      const uploadBody = (await uploadRes.json()) as { publicUrl?: string };
      imageUrl = uploadBody.publicUrl ?? null;
    }
    const res = await fetch("/api/battlegames", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description: description || null,
        game_type: gameType,
        lives: lives || null,
        respawn: respawn || null,
        base: base || null,
        teams: teams || null,
        objectives: objectives || null,
        refresh: refresh || null,
        scenario_rules: scenarioRules || null,
        min_players: minPlayers ? Number(minPlayers) : null,
        max_players: maxPlayers ? Number(maxPlayers) : null,
        min_teams: minTeams ? Number(minTeams) : null,
        max_teams: maxTeams ? Number(maxTeams) : null,
        image_url: imageUrl,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Failed");
      return;
    }
    const data = (await res.json()) as { id?: number };
    if (data.id) router.push(`/battlegames/${data.id}`);
    else router.push("/battlegames");
    router.refresh();
  }

  return (
    <main className="px-4 py-4 sm:px-6 lg:px-10 text-white max-w-2xl space-y-5 sm:space-y-6">
      <Link href="/battlegames" className="text-sm text-blue-400 hover:underline">
        ← Battlegames
      </Link>
      <h1 className="text-xl sm:text-2xl font-bold">Create battlegame</h1>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm text-neutral-400 mb-1">Name</label>
          <input
            className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm text-neutral-400 mb-1">Game Type</label>
          <select
            className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded"
            value={gameType}
            onChange={(e) => setGameType(e.target.value)}
          >
            {BATTLEGAME_TYPES_WITHOUT_ALL.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-neutral-400 mb-1">Lives</label>
          <input className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded" value={lives} onChange={(e) => setLives(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm text-neutral-400 mb-1">Respawn</label>
          <input className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded" value={respawn} onChange={(e) => setRespawn(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm text-neutral-400 mb-1">Base</label>
          <input className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded" value={base} onChange={(e) => setBase(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm text-neutral-400 mb-1">Teams</label>
          <input className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded" value={teams} onChange={(e) => setTeams(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm text-neutral-400 mb-1">Min players</label>
          <input className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded" inputMode="numeric" value={minPlayers} onChange={(e) => setMinPlayers(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm text-neutral-400 mb-1">Max players</label>
          <input className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded" inputMode="numeric" value={maxPlayers} onChange={(e) => setMaxPlayers(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm text-neutral-400 mb-1">Min teams</label>
          <input className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded" inputMode="numeric" value={minTeams} onChange={(e) => setMinTeams(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm text-neutral-400 mb-1">Max teams</label>
          <input className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded" inputMode="numeric" value={maxTeams} onChange={(e) => setMaxTeams(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm text-neutral-400 mb-1">Objectives</label>
          <textarea className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded min-h-24" value={objectives} onChange={(e) => setObjectives(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm text-neutral-400 mb-1">Refresh</label>
          <input className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded" value={refresh} onChange={(e) => setRefresh(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm text-neutral-400 mb-1">Scenario Rules</label>
          <textarea className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded min-h-24" value={scenarioRules} onChange={(e) => setScenarioRules(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm text-neutral-400 mb-1">Image</label>
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>
        <div>
          <label className="block text-sm text-neutral-400 mb-1">Description</label>
          <textarea
            className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded min-h-32"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <button type="submit" disabled={busy} className="px-4 py-2 bg-blue-600 rounded">
          {busy ? "Saving…" : "Create"}
        </button>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
      </form>
    </main>
  );
}
