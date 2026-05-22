"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { BuildGroupMemberBuild } from "@/lib/buildGroups/types";

export type BuildGroupFormRow = {
  id: number;
  owner_id: string;
  name: string;
  description: string | null;
};

export type BuildPickerOption = {
  id: number;
  name: string;
  class: string;
  level: number;
};

type Props = {
  mode: "create" | "edit";
  groupId?: number;
  initial?: BuildGroupFormRow;
  initialMemberBuilds?: BuildGroupMemberBuild[];
  allBuilds?: BuildPickerOption[];
};

function str(v: string | null | undefined): string {
  return v ?? "";
}

export default function BuildGroupForm({
  mode,
  groupId,
  initial,
  initialMemberBuilds = [],
  allBuilds = [],
}: Props) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(str(initial?.description));
  const [memberIds, setMemberIds] = useState<number[]>(() =>
    initialMemberBuilds.map((b) => b.id)
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [membersBusy, setMembersBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const buildsById = useMemo(() => {
    const m = new Map<number, BuildPickerOption | BuildGroupMemberBuild>();
    for (const b of allBuilds) m.set(b.id, b);
    for (const b of initialMemberBuilds) m.set(b.id, b);
    return m;
  }, [allBuilds, initialMemberBuilds]);

  const memberBuilds = useMemo(() => {
    return memberIds
      .map((id) => buildsById.get(id))
      .filter((b): b is BuildPickerOption | BuildGroupMemberBuild => b != null);
  }, [memberIds, buildsById]);

  const addOptions = useMemo(() => {
    const onGroup = new Set(memberIds);
    return allBuilds
      .filter((b) => !onGroup.has(b.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allBuilds, memberIds]);

  async function submitMetadata(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const payload = { name, description: description || null };

    if (mode === "create") {
      const res = await fetch("/api/build-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, buildIds: memberIds }),
      });
      setBusy(false);
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Failed");
        return;
      }
      const data = (await res.json()) as { id?: number };
      if (data.id) router.push(`/build-groups/${data.id}`);
      else router.push("/build-groups");
      router.refresh();
      return;
    }

    const patchRes = await fetch(`/api/build-groups/${groupId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!patchRes.ok) {
      setBusy(false);
      const body = (await patchRes.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Failed to save details");
      return;
    }

    const buildsRes = await fetch(`/api/build-groups/${groupId}/builds`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ buildIds: memberIds }),
    });
    setBusy(false);
    if (!buildsRes.ok) {
      const body = (await buildsRes.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Failed to save builds");
      return;
    }
    router.push(`/build-groups/${groupId}`);
    router.refresh();
  }

  async function saveMembership() {
    if (mode !== "edit" || !groupId) return;
    setMembersBusy(true);
    setError("");
    const res = await fetch(`/api/build-groups/${groupId}/builds`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ buildIds: memberIds }),
    });
    setMembersBusy(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Failed to save builds");
      return;
    }
    router.refresh();
  }

  function addBuild(buildId: number) {
    if (!buildId || memberIds.includes(buildId)) return;
    setMemberIds((prev) => [...prev, buildId]);
  }

  function removeBuild(buildId: number) {
    setMemberIds((prev) => prev.filter((id) => id !== buildId));
  }

  async function deleteGroup() {
    if (mode !== "edit" || !groupId) return;
    if (!confirm("Delete this build group? This cannot be undone.")) return;
    setDeleteBusy(true);
    setError("");
    const res = await fetch(`/api/build-groups/${groupId}`, { method: "DELETE" });
    setDeleteBusy(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Failed to delete");
      return;
    }
    router.push("/build-groups");
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <form onSubmit={submitMetadata} className="space-y-4">
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
          {busy
            ? "Saving…"
            : mode === "create"
              ? "Create Build Group"
              : "Save Build Group"}
        </button>
      </form>

      <section className="rounded-lg border border-neutral-800 overflow-hidden">
        <h2 className="px-4 py-2 bg-neutral-900 border-b border-neutral-800 text-lg font-semibold">
          Builds in Group
        </h2>
        <div className="p-4 border-b border-neutral-800 space-y-2">
          <label htmlFor="build-group-add-build" className="block text-sm text-neutral-400">
            Add a build
          </label>
          <select
            id="build-group-add-build"
            className="w-full max-w-xl px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-sm"
            disabled={addOptions.length === 0}
            defaultValue=""
            onChange={(e) => {
              const v = Number(e.target.value);
              if (!Number.isFinite(v)) return;
              addBuild(v);
              e.target.value = "";
            }}
          >
            <option value="">Choose a build…</option>
            {addOptions.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.class} L{b.level})
              </option>
            ))}
          </select>
        </div>
        {memberBuilds.length === 0 ? (
          <p className="px-4 py-6 text-sm text-neutral-500">No builds in this group yet.</p>
        ) : (
          <ul className="divide-y divide-neutral-800">
            {memberBuilds.map((b) => (
              <li
                key={b.id}
                className="px-4 py-3 flex flex-wrap items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <Link
                    href={`/builds/${b.id}`}
                    className="text-blue-400 hover:underline"
                    data-prevent-build-group-row-nav
                  >
                    {b.name}
                  </Link>
                  <p className="text-sm text-neutral-500">
                    {b.class} level {b.level}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeBuild(b.id)}
                  className="px-3 py-1 text-sm bg-neutral-700 rounded hover:bg-neutral-600"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        {mode === "edit" ? (
          <div className="p-4 border-t border-neutral-800">
            <button
              type="button"
              disabled={membersBusy}
              onClick={() => void saveMembership()}
              className="px-4 py-2 bg-blue-600 rounded text-sm"
            >
              {membersBusy ? "Saving…" : "Save Builds"}
            </button>
          </div>
        ) : null}
      </section>

      {mode === "edit" ? (
        <div className="pt-4 border-t border-neutral-800">
          <button
            type="button"
            disabled={deleteBusy}
            onClick={() => void deleteGroup()}
            className="px-4 py-2 bg-red-800 rounded text-sm"
          >
            {deleteBusy ? "Deleting…" : "Delete Build Group"}
          </button>
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  );
}
