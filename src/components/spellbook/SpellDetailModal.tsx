"use client";

import type { SpellRow } from "@/lib/spellbook/types";

type Props = {
  spell: SpellRow | null;
  onClose: () => void;
};

export default function SpellDetailModal({ spell, onClose }: Props) {
  if (!spell) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-xl rounded-lg border border-neutral-700 bg-neutral-900 p-5 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold">{spell.name}</h2>
            <p className="text-sm text-neutral-400">
              {spell.type ?? "Unknown type"}
              {spell.school ? ` - ${spell.school}` : ""}
              {spell.range ? ` (${spell.range})` : ""}
            </p>
          </div>
          <button className="px-2 py-1 bg-neutral-700 rounded" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="mt-4 space-y-2 text-sm">
          <p>
            <span className="font-semibold">Cost:</span> {spell.cost ?? 0}
          </p>
          <p>
            <span className="font-semibold">Frequency:</span> {spell.frequency ?? "N/A"}
          </p>
          {spell.materials ? (
            <p>
              <span className="font-semibold">Materials:</span> {spell.materials}
            </p>
          ) : null}
          {spell.incantation ? (
            <p className="whitespace-pre-wrap">
              <span className="font-semibold">Incantation:</span> {spell.incantation}
            </p>
          ) : null}
          {spell.effect ? (
            <p className="whitespace-pre-wrap">
              <span className="font-semibold">Effect:</span> {spell.effect}
            </p>
          ) : null}
          {spell.limitation ? (
            <p className="whitespace-pre-wrap">
              <span className="font-semibold">Limitation:</span> {spell.limitation}
            </p>
          ) : null}
          {spell.note ? (
            <p className="whitespace-pre-wrap">
              <span className="font-semibold">Note:</span> {spell.note}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
