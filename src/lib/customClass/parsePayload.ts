import type { CustomClassWizardPayload, SpellFrequencyInput } from "@/lib/customClass/types";

function parseFrequency(value: unknown): SpellFrequencyInput | null {
  if (value == null) return null;
  if (typeof value !== "object" || Array.isArray(value)) return null;
  const o = value as Record<string, unknown>;
  return {
    amount:
      typeof o.amount === "number"
        ? o.amount
        : o.amount === null
          ? null
          : typeof o.amount === "string" && o.amount.trim() !== ""
            ? Number(o.amount)
            : null,
    per: typeof o.per === "string" ? o.per : o.per === null ? null : null,
    charge: typeof o.charge === "string" ? o.charge : o.charge === null ? null : null,
  };
}

export function parseCustomClassPayload(body: Record<string, unknown>): CustomClassWizardPayload {
  return {
    name: typeof body.name === "string" ? body.name : "",
    description:
      typeof body.description === "string"
        ? body.description
        : body.description === null
          ? null
          : null,
    class_type: body.class_type === "caster" ? "caster" : "martial",
    armor: typeof body.armor === "string" ? body.armor : body.armor === null ? null : null,
    shields: typeof body.shields === "string" ? body.shields : body.shields === null ? null : null,
    weapons: typeof body.weapons === "string" ? body.weapons : body.weapons === null ? null : null,
    rules: Array.isArray(body.rules)
      ? body.rules.map((r) => {
          const rule = r as Record<string, unknown>;
          return {
            spell_kind: rule.spell_kind === "custom" ? ("custom" as const) : ("canonical" as const),
            spell_id: Number(rule.spell_id),
            spell_level: Number(rule.spell_level),
            cost: Number(rule.cost ?? 0),
            max_count: rule.max_count == null ? null : Number(rule.max_count),
            frequency: parseFrequency(rule.frequency),
            restricted: Boolean(rule.restricted),
            source_type: String(rule.source_type ?? "base"),
            option_group:
              typeof rule.option_group === "string"
                ? rule.option_group
                : rule.option_group === null
                  ? null
                  : null,
            is_look_the_part: Boolean(rule.is_look_the_part),
          };
        })
      : [],
  };
}
