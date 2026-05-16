"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type CustomClassRow = {
  id: number;
  owner_id: string;
  name: string;
  description: string | null;
};

type Props = {
  mode: "create" | "edit";
  classId?: number;
  initial?: CustomClassRow;
};

function str(v: string | null | undefined): string {
  return v ?? "";
}

export default function CustomClassForm({ mode, classId, initial }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(str(initial?.description));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const payload = { name, description: description || null };
    const res =
      mode === "create"
        ? await fetch("/api/custom-classes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch(`/api/custom-classes/${classId}`, {
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
      if (data.id) router.push(`/custom-classes/${data.id}`);
      else router.push("/custom-classes");
    } else {
      router.push(`/custom-classes/${classId}`);
    }
    router.refresh();
  }

  return (
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
        {busy ? "Saving…" : mode === "create" ? "Create" : "Save Custom Class"}
      </button>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </form>
  );
}
