/**
 * Formats frequency values from Supabase (jsonb / string) like the upstream spellbook / swiftgard.com:
 * `{ amount, per, charge }` → `1/Life`, `1/Refresh Charge x5`, `Unlimited`, etc.
 */

export function formatSpellFrequency(raw: unknown): string | null {
  if (raw == null) return null;

  if (typeof raw === "string") {
    const t = raw.trim();
    if (!t) return null;
    if (t.startsWith("{") && t.endsWith("}")) {
      try {
        return formatSpellFrequency(JSON.parse(t) as unknown);
      } catch {
        return t;
      }
    }
    return t;
  }

  if (typeof raw !== "object" || Array.isArray(raw)) return null;

  const o = raw as Record<string, unknown>;
  const amount = o.amount;
  const per = o.per;
  const charge = o.charge;

  const perStr = typeof per === "string" && per.trim() ? per.trim() : "";
  const chargeStr = typeof charge === "string" && charge.trim() && charge !== "null" ? charge.trim() : "";

  if (chargeStr === "Unlimited" && (amount == null || amount === "") && !perStr) {
    return "Unlimited";
  }

  const left =
    typeof amount === "number" && Number.isFinite(amount) && perStr
      ? `${amount}/${perStr}`
      : perStr
        ? perStr
        : typeof amount === "number" && Number.isFinite(amount)
          ? String(amount)
          : "";

  if (!left && !chargeStr) return null;
  if (!left) return chargeStr;
  if (!chargeStr) return left;
  return `${left} ${chargeStr}`;
}
