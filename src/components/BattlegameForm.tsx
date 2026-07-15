"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BATTLEGAME_TYPES_WITHOUT_ALL, type BattlegameRow } from "@/lib/battlegames";

type Props = {
  mode: "create" | "edit";
  battlegameId?: number;
  initial?: BattlegameRow;
};

function str(v: string | null | undefined): string {
  return v ?? "";
}

function numStr(v: number | null | undefined): string {
  return v == null ? "" : String(v);
}

export default function BattlegameForm({ mode, battlegameId, initial }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(str(initial?.description));
  const [gameType, setGameType] = useState(initial?.game_type ?? "Full-Class");
  const [lives, setLives] = useState(str(initial?.lives));
  const [respawn, setRespawn] = useState(str(initial?.respawn));
  const [base, setBase] = useState(str(initial?.base));
  const [teams, setTeams] = useState(str(initial?.teams));
  const [minPlayers, setMinPlayers] = useState(numStr(initial?.min_players));
  const [maxPlayers, setMaxPlayers] = useState(numStr(initial?.max_players));
  const [minTeams, setMinTeams] = useState(numStr(initial?.min_teams));
  const [maxTeams, setMaxTeams] = useState(numStr(initial?.max_teams));
  const [objectives, setObjectives] = useState(str(initial?.objectives));
  const [refresh, setRefresh] = useState(str(initial?.refresh));
  const [equipmentNeeded, setEquipmentNeeded] = useState(str(initial?.equipment_needed));
  const [timeLimit, setTimeLimit] = useState(str(initial?.time_limit));
  const [scenarioRules, setScenarioRules] = useState(str(initial?.scenario_rules));
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const existingImageUrl = initial?.image_url ?? null;

  function buildPayload(imageUrl: string | null) {
    return {
      name,
      description: description || null,
      game_type: gameType,
      lives: lives || null,
      respawn: respawn || null,
      base: base || null,
      teams: teams || null,
      objectives: objectives || null,
      refresh: refresh || null,
      equipment_needed: equipmentNeeded || null,
      time_limit: timeLimit || null,
      scenario_rules: scenarioRules || null,
      min_players: minPlayers ? Number(minPlayers) : null,
      max_players: maxPlayers ? Number(maxPlayers) : null,
      min_teams: minTeams ? Number(minTeams) : null,
      max_teams: maxTeams ? Number(maxTeams) : null,
      image_url: imageUrl,
    };
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    let imageUrl: string | null = mode === "edit" ? existingImageUrl : null;
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
      imageUrl = uploadBody.publicUrl ?? imageUrl;
    }
    const payload = buildPayload(imageUrl);
    const res =
      mode === "create"
        ? await fetch("/api/battlegames", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch(`/api/battlegames/${battlegameId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
    setBusy(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Failed");
      return;
    }
    if (mode === "create") {
      const data = (await res.json()) as { id?: number };
      if (data.id) router.push(`/battlegames/${data.id}`);
      else router.push("/battlegames");
    } else {
      router.push(`/battlegames/${battlegameId}`);
    }
    router.refresh();
  }

  return (
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
        <label className="block text-sm text-neutral-400 mb-1">Min Players</label>
        <input className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded" inputMode="numeric" value={minPlayers} onChange={(e) => setMinPlayers(e.target.value)} />
      </div>
      <div>
        <label className="block text-sm text-neutral-400 mb-1">Max Players</label>
        <input className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded" inputMode="numeric" value={maxPlayers} onChange={(e) => setMaxPlayers(e.target.value)} />
      </div>
      <div>
        <label className="block text-sm text-neutral-400 mb-1">Min Teams</label>
        <input className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded" inputMode="numeric" value={minTeams} onChange={(e) => setMinTeams(e.target.value)} />
      </div>
      <div>
        <label className="block text-sm text-neutral-400 mb-1">Max Teams</label>
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
        <label className="block text-sm text-neutral-400 mb-1">Time Limit</label>
        <input className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded" value={timeLimit} onChange={(e) => setTimeLimit(e.target.value)} />
      </div>
      <div>
        <label className="block text-sm text-neutral-400 mb-1">Equipment Needed</label>
        <textarea className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded min-h-24" value={equipmentNeeded} onChange={(e) => setEquipmentNeeded(e.target.value)} />
      </div>
      <div>
        <label className="block text-sm text-neutral-400 mb-1">Scenario Rules</label>
        <textarea className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded min-h-24" value={scenarioRules} onChange={(e) => setScenarioRules(e.target.value)} />
      </div>
      <div>
        <label className="block text-sm text-neutral-400 mb-1">Image</label>
        {existingImageUrl && !file ? (
          <img src={existingImageUrl} alt="" className="mb-2 max-h-48 rounded border border-neutral-700 object-contain" />
        ) : null}
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
        {busy ? "Saving…" : mode === "create" ? "Create" : "Save Battlegame"}
      </button>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </form>
  );
}
