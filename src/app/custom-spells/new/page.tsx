"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewCustomSpellPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/custom-spells", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description: description || null }),
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
    <main className="p-10 text-white max-w-lg space-y-6">
      <Link href="/custom-spells" className="text-sm text-blue-400 hover:underline">
        ← Custom spells
      </Link>
      <h1 className="text-2xl font-bold">Create custom spell</h1>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm text-neutral-400 mb-1">Name</label>
          <input
            className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm text-neutral-400 mb-1">Description</label>
          <textarea
            className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded min-h-28"
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
