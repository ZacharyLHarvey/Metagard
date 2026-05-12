"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewMonsterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [monsterType, setMonsterType] = useState("");
  const [threatLevel, setThreatLevel] = useState("");
  const [armorPoints, setArmorPoints] = useState("");
  const [abilities, setAbilities] = useState("");
  const [immunities, setImmunities] = useState("");
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
      imageUrl = uploadBody.publicUrl ?? null;
    }
    const res = await fetch("/api/monsters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description: description || null,
        monster_type: monsterType || null,
        threat_level: threatLevel || null,
        armor_points: armorPoints || null,
        abilities: abilities || null,
        immunities: immunities || null,
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
    if (data.id) router.push(`/monsters/${data.id}`);
    else router.push("/monsters");
    router.refresh();
  }

  return (
    <main className="px-4 py-4 sm:px-6 lg:px-10 text-white max-w-2xl space-y-5 sm:space-y-6">
      <Link href="/monsters" className="text-sm text-blue-400 hover:underline">
        ← Monsters
      </Link>
      <h1 className="text-xl sm:text-2xl font-bold">Create Monster</h1>
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
