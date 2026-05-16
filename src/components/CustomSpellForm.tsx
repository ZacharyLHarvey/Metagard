"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type CustomSpellRow = {
  id: number;
  owner_id: string;
  name: string;
  description: string | null;
  spell_type: string | null;
  school: string | null;
  range: string | null;
  incantation: string | null;
  materials: string | null;
  effect: string | null;
  limitations: string | null;
  notes: string | null;
  image_url: string | null;
};

type Props = {
  mode: "create" | "edit";
  spellId?: number;
  initial?: CustomSpellRow;
};

function str(v: string | null | undefined): string {
  return v ?? "";
}

export default function CustomSpellForm({ mode, spellId, initial }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(str(initial?.description));
  const [spellType, setSpellType] = useState(str(initial?.spell_type));
  const [school, setSchool] = useState(str(initial?.school));
  const [range, setRange] = useState(str(initial?.range));
  const [incantation, setIncantation] = useState(str(initial?.incantation));
  const [materials, setMaterials] = useState(str(initial?.materials));
  const [effect, setEffect] = useState(str(initial?.effect));
  const [limitations, setLimitations] = useState(str(initial?.limitations));
  const [notes, setNotes] = useState(str(initial?.notes));
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const existingImageUrl = initial?.image_url ?? null;

  function buildPayload(imageUrl: string | null) {
    return {
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
    };
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    let imageUrl: string | null = mode === "edit" ? existingImageUrl : null;
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
      imageUrl = uploadBody.publicUrl ?? imageUrl;
    }
    const payload = buildPayload(imageUrl);
    const res =
      mode === "create"
        ? await fetch("/api/custom-spells", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch(`/api/custom-spells/${spellId}`, {
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
      if (data.id) router.push(`/custom-spells/${data.id}`);
      else router.push("/custom-spells");
    } else {
      router.push(`/custom-spells/${spellId}`);
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
        {busy ? "Saving…" : mode === "create" ? "Create" : "Save Custom Spell"}
      </button>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </form>
  );
}
