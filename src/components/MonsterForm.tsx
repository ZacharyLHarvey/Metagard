"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type MonsterRow = {
  id: number;
  owner_id: string;
  name: string;
  description: string | null;
  monster_type: string | null;
  threat_level: string | null;
  armor_points: string | null;
  abilities: string | null;
  immunities: string | null;
  image_url: string | null;
};

type Props = {
  mode: "create" | "edit";
  monsterId?: number;
  initial?: MonsterRow;
};

function str(v: string | null | undefined): string {
  return v ?? "";
}

export default function MonsterForm({ mode, monsterId, initial }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(str(initial?.description));
  const [monsterType, setMonsterType] = useState(str(initial?.monster_type));
  const [threatLevel, setThreatLevel] = useState(str(initial?.threat_level));
  const [armorPoints, setArmorPoints] = useState(str(initial?.armor_points));
  const [abilities, setAbilities] = useState(str(initial?.abilities));
  const [immunities, setImmunities] = useState(str(initial?.immunities));
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const existingImageUrl = initial?.image_url ?? null;

  function buildPayload(imageUrl: string | null) {
    return {
      name,
      description: description || null,
      monster_type: monsterType || null,
      threat_level: threatLevel || null,
      armor_points: armorPoints || null,
      abilities: abilities || null,
      immunities: immunities || null,
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
      form.append("entity", "monsters");
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
        ? await fetch("/api/monsters", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch(`/api/monsters/${monsterId}`, {
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
      if (data.id) router.push(`/monsters/${data.id}`);
      else router.push("/monsters");
    } else {
      router.push(`/monsters/${monsterId}`);
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
        <label className="block text-sm text-neutral-400 mb-1">Monster Type</label>
        <input className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded" value={monsterType} onChange={(e) => setMonsterType(e.target.value)} />
      </div>
      <div>
        <label className="block text-sm text-neutral-400 mb-1">Threat Level</label>
        <input className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded" value={threatLevel} onChange={(e) => setThreatLevel(e.target.value)} />
      </div>
      <div>
        <label className="block text-sm text-neutral-400 mb-1">Armor Points</label>
        <input className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded" value={armorPoints} onChange={(e) => setArmorPoints(e.target.value)} />
      </div>
      <div>
        <label className="block text-sm text-neutral-400 mb-1">Abilities</label>
        <textarea className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded min-h-24" value={abilities} onChange={(e) => setAbilities(e.target.value)} />
      </div>
      <div>
        <label className="block text-sm text-neutral-400 mb-1">Immunities</label>
        <textarea className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded min-h-24" value={immunities} onChange={(e) => setImmunities(e.target.value)} />
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
        {busy ? "Saving…" : mode === "create" ? "Create" : "Save Monster"}
      </button>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </form>
  );
}
