"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewCustomSpellPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [spellType, setSpellType] = useState("");
  const [school, setSchool] = useState("");
  const [range, setRange] = useState("");
  const [incantation, setIncantation] = useState("");
  const [materials, setMaterials] = useState("");
  const [effect, setEffect] = useState("");
  const [limitations, setLimitations] = useState("");
  const [notes, setNotes] = useState("");
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
      form.append("entity", "custom-spells");
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
    const res = await fetch("/api/custom-spells", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description: description || null,
        spell_type: spellType || null,
        school: school || null,
        range: range || null,
        incantation: incantation || null,
        materials: materials || null,
        effect: effect || null,
        limitations: limitations || null,
        notes: notes || null,
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
    if (data.id) router.push(`/custom-spells/${data.id}`);
    else router.push("/custom-spells");
    router.refresh();
  }

  return (
    <main className="px-4 py-4 sm:px-6 lg:px-10 text-white max-w-2xl space-y-5 sm:space-y-6">
      <Link href="/custom-spells" className="text-sm text-blue-400 hover:underline">
        ← Custom Spells
      </Link>
      <h1 className="text-xl sm:text-2xl font-bold">Create Custom Spell</h1>
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
          <label className="block text-sm text-neutral-400 mb-1">Type (T)</label>
          <input className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded" value={spellType} onChange={(e) => setSpellType(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm text-neutral-400 mb-1">School (S)</label>
          <input className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded" value={school} onChange={(e) => setSchool(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm text-neutral-400 mb-1">Range (R)</label>
          <input className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded" value={range} onChange={(e) => setRange(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm text-neutral-400 mb-1">Incantation (I)</label>
          <textarea className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded min-h-24" value={incantation} onChange={(e) => setIncantation(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm text-neutral-400 mb-1">Materials (M)</label>
          <input className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded" value={materials} onChange={(e) => setMaterials(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm text-neutral-400 mb-1">Effect (E)</label>
          <textarea className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded min-h-24" value={effect} onChange={(e) => setEffect(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm text-neutral-400 mb-1">Limitations (L)</label>
          <textarea className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded min-h-24" value={limitations} onChange={(e) => setLimitations(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm text-neutral-400 mb-1">Notes (N)</label>
          <textarea className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded min-h-24" value={notes} onChange={(e) => setNotes(e.target.value)} />
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
