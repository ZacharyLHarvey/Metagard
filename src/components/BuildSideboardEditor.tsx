"use client";

import { useMemo, useState } from "react";
import SideboardSpellList from "@/components/SideboardSpellList";
import type { BuildSpellSelectionRow, SpellRow } from "@/lib/spellbook/types";

type Props = {
  buildId: number;
  catalogSpells: SpellRow[];
  initialSideboardIds: number[];
  selections: BuildSpellSelectionRow[];
  spellbookTipsEnabled: boolean;
  spellDetailLongPressEnabled?: boolean;
};

export default function BuildSideboardEditor({
  buildId,
  catalogSpells,
  initialSideboardIds,
  selections,
  spellbookTipsEnabled,
  spellDetailLongPressEnabled = true,
}: Props) {
  const [ids, setIds] = useState<number[]>(() => [...initialSideboardIds]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [removingSpellId, setRemovingSpellId] = useState<number | null>(null);

  const chosenSpellIds = useMemo(() => {
    const s = new Set<number>();
    for (const row of selections) {
      if (row.purchased > 0) s.add(row.spell_id);
    }
    return s;
  }, [selections]);

  const spellsById = useMemo(() => {
    const m = new Map<number, SpellRow>();
    for (const sp of catalogSpells) {
      if (!m.has(sp.id)) m.set(sp.id, sp);
    }
    return m;
  }, [catalogSpells]);

  const orderedSpells = useMemo(() => {
    const out: SpellRow[] = [];
    for (const id of ids) {
      const sp = spellsById.get(id);
      if (sp) out.push(sp);
    }
    return out;
  }, [ids, spellsById]);

  const addOptions = useMemo(() => {
    const onBoard = new Set(ids);
    return catalogSpells
      .filter((sp) => !chosenSpellIds.has(sp.id) && !onBoard.has(sp.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [catalogSpells, chosenSpellIds, ids]);

  async function persist(nextIds: number[]) {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/builds/${buildId}/sideboard`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spellIds: nextIds }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Save failed");
      }
      setIds(nextIds);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
      setRemovingSpellId(null);
    }
  }

  async function addSpell(spellId: number) {
    if (!spellId || ids.includes(spellId)) return;
    await persist([...ids, spellId]);
  }

  async function removeSpell(spellId: number) {
    setRemovingSpellId(spellId);
    await persist(ids.filter((id) => id !== spellId));
  }

  return (
    <section className="rounded-lg border border-neutral-800 overflow-hidden">
      <h2 className="px-4 py-2 bg-neutral-900 border-b border-neutral-800 text-lg font-semibold">Sideboard</h2>
      <div className="p-4 border-b border-neutral-800 space-y-2">
        <label htmlFor={`sideboard-add-${buildId}`} className="block text-sm text-neutral-400">
          Add a spell (class catalog, not on your spell list)
        </label>
        <select
          id={`sideboard-add-${buildId}`}
          className="w-full max-w-xl px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-sm"
          disabled={saving || addOptions.length === 0}
          defaultValue=""
          onChange={(e) => {
            const v = Number(e.target.value);
            if (!Number.isFinite(v)) return;
            void addSpell(v);
            e.target.value = "";
          }}
        >
          <option value="">Choose a spell…</option>
          {addOptions.map((sp) => (
            <option key={sp.id} value={sp.id}>
              {sp.name}
              {sp.level != null ? ` (L${sp.level})` : ""}
            </option>
          ))}
        </select>
        {addOptions.length === 0 ? (
          <p className="text-xs text-neutral-500">
            No more spells available here (already chosen or on sideboard).
          </p>
        ) : null}
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
      </div>
      <SideboardSpellList
        spells={orderedSpells}
        spellbookTipsEnabled={spellbookTipsEnabled}
        spellDetailLongPressEnabled={spellDetailLongPressEnabled}
        onRemove={(id) => void removeSpell(id)}
        removingSpellId={removingSpellId}
      />
    </section>
  );
}
