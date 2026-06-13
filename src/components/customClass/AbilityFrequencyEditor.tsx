"use client";

import type { SpellFrequencyInput } from "@/lib/customClass/types";
import {
  FREQUENCY_CATEGORIES,
  frequencyAmountFromInput,
  frequencyCategoryFromInput,
  frequencyChargeFromInput,
  frequencyInputFromCategory,
  type FrequencyCategory,
} from "@/lib/customClass/frequency";
import { formatSpellFrequency } from "@/lib/spellbook/formatFrequency";

type Props = {
  value: SpellFrequencyInput | null;
  onChange: (value: SpellFrequencyInput | null) => void;
  compact?: boolean;
};

export default function AbilityFrequencyEditor({ value, onChange, compact = false }: Props) {
  const category = frequencyCategoryFromInput(value);
  const amount = frequencyAmountFromInput(value);
  const chargeText = frequencyChargeFromInput(value);
  const preview = formatSpellFrequency(value);

  function setCategory(next: FrequencyCategory) {
    if (next === "none") {
      onChange(null);
      return;
    }
    if (next === "unlimited") {
      onChange(frequencyInputFromCategory("unlimited", null, ""));
      return;
    }
    onChange(frequencyInputFromCategory(next, amount ?? 1, chargeText));
  }

  function setAmount(raw: string) {
    const parsed = raw.trim() === "" ? null : Number(raw);
    const nextAmount =
      parsed != null && Number.isFinite(parsed) ? parsed : category === "none" ? null : 1;
    onChange(frequencyInputFromCategory(category, nextAmount, chargeText));
  }

  function setCharge(raw: string) {
    if (category === "none" || category === "unlimited") return;
    onChange(frequencyInputFromCategory(category, amount, raw));
  }

  const showAmount = category === "per_life" || category === "per_refresh";
  const showCharge = showAmount;

  return (
    <div className={compact ? "space-y-2" : "space-y-3 border-t border-neutral-800 pt-3"}>
      <div className={compact ? "grid sm:grid-cols-2 gap-3" : "grid sm:grid-cols-3 gap-3"}>
        <div className={compact ? "sm:col-span-2" : "sm:col-span-1"}>
          <label className="block text-sm text-neutral-400 mb-1">Frequency Category</label>
          <select
            className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value as FrequencyCategory)}
          >
            {FREQUENCY_CATEGORIES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        {showAmount ? (
          <div>
            <label className="block text-sm text-neutral-400 mb-1">
              Uses per {category === "per_life" ? "Life" : "Refresh"}
            </label>
            <input
              type="number"
              min={1}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-sm"
              value={amount ?? ""}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        ) : null}
        {showCharge ? (
          <div>
            <label className="block text-sm text-neutral-400 mb-1">Charge (optional)</label>
            <input
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-sm"
              value={chargeText}
              onChange={(e) => setCharge(e.target.value)}
              placeholder="e.g. Charge x5"
            />
          </div>
        ) : null}
      </div>
      {preview ? (
        <p className="text-xs text-neutral-500">
          Preview: <span className="text-neutral-300">{preview}</span>
        </p>
      ) : null}
    </div>
  );
}
