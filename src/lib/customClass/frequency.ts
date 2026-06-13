import type { SpellFrequencyInput } from "@/lib/customClass/types";

export const FREQUENCY_CATEGORIES = [
  { value: "none", label: "Not set" },
  { value: "unlimited", label: "Unlimited" },
  { value: "per_life", label: "Per Life" },
  { value: "per_refresh", label: "Per Refresh" },
] as const;

export type FrequencyCategory = (typeof FREQUENCY_CATEGORIES)[number]["value"];

export function frequencyCategoryFromInput(
  freq: SpellFrequencyInput | null | undefined
): FrequencyCategory {
  if (freq == null) return "none";
  if (freq.charge === "Unlimited" && freq.amount == null && !freq.per) return "unlimited";
  if (freq.per === "Life") return "per_life";
  if (freq.per === "Refresh") return "per_refresh";
  if (freq.charge === "Unlimited") return "unlimited";
  return "none";
}

export function frequencyAmountFromInput(freq: SpellFrequencyInput | null | undefined): number | null {
  if (!freq) return null;
  return typeof freq.amount === "number" && Number.isFinite(freq.amount) ? freq.amount : null;
}

export function frequencyChargeFromInput(freq: SpellFrequencyInput | null | undefined): string {
  if (!freq?.charge || freq.charge === "Unlimited") return "";
  return freq.charge;
}

export function frequencyInputFromCategory(
  category: FrequencyCategory,
  amount: number | null,
  chargeText: string
): SpellFrequencyInput | null {
  // Preserve spaces while typing (e.g. "Charge " before "x5"); only treat whitespace-only as empty.
  const charge = chargeText.trim() === "" ? null : chargeText;
  switch (category) {
    case "none":
      return null;
    case "unlimited":
      return { amount: null, per: null, charge: "Unlimited" };
    case "per_life":
      return {
        amount: amount ?? 1,
        per: "Life",
        charge,
      };
    case "per_refresh":
      return {
        amount: amount ?? 1,
        per: "Refresh",
        charge,
      };
    default:
      return null;
  }
}
