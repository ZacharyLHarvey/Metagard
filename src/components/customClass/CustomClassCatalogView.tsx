import type { CustomClassSpellRuleRow } from "@/lib/customClass/types";
import { isLookThePartRule } from "@/lib/customClass/types";
import { formatSpellFrequency } from "@/lib/spellbook/formatFrequency";

type Props = {
  classType: "martial" | "caster";
  rules: CustomClassSpellRuleRow[];
};

function RuleItem({
  rule,
  classType,
}: {
  rule: CustomClassSpellRuleRow;
  classType: "martial" | "caster";
}) {
  const freq = formatSpellFrequency(rule.frequency);

  return (
    <li className="text-sm border border-neutral-800 rounded p-2 bg-neutral-900/40">
      <p className="font-medium">
        {rule.spell_name ?? `Spell #${rule.spell_id}`}{" "}
        <span className="text-neutral-500 font-normal">
          ({rule.spell_kind === "custom" ? "Custom" : "Canonical"})
        </span>
      </p>
      <p className="text-xs text-neutral-500 mt-1">
        {classType === "caster" ? (
          <>
            Cost {rule.cost}
            {rule.max_count != null ? ` · Max ${rule.max_count}` : ""}
            {rule.restricted ? " · Restricted" : ""}
            {freq ? ` · ${freq}` : ""}
          </>
        ) : (
          <>
            {rule.source_type}
            {rule.option_group ? ` · Group: ${rule.option_group}` : ""}
            {rule.is_look_the_part ? " · LtP" : ""}
            {freq ? ` · ${freq}` : ""}
          </>
        )}
      </p>
    </li>
  );
}

export default function CustomClassCatalogView({ classType, rules }: Props) {
  const baseRules = rules.filter((r) => !isLookThePartRule(r));
  const ltpRules = rules.filter(isLookThePartRule);
  const byLevel: Record<number, CustomClassSpellRuleRow[]> = {};
  for (let i = 1; i <= 6; i += 1) byLevel[i] = [];
  for (const rule of baseRules) {
    byLevel[rule.spell_level]?.push(rule);
  }

  return (
    <section className="border border-neutral-800 rounded-lg p-4 space-y-4">
      <h2 className="text-lg font-semibold">
        {classType === "martial" ? "Ability catalog" : "Spell catalog"}
      </h2>
      {rules.length === 0 ? (
        <p className="text-sm text-neutral-500">No abilities defined yet.</p>
      ) : (
        <>
          {classType === "martial" && ltpRules.length > 0 ? (
            <div>
              <h3 className="text-sm font-medium text-neutral-300 mb-2">Look the Part</h3>
              <ul className="space-y-2">
                {ltpRules.map((rule, idx) => (
                  <RuleItem key={`ltp-${rule.spell_id}-${idx}`} rule={rule} classType={classType} />
                ))}
              </ul>
            </div>
          ) : null}
          {[1, 2, 3, 4, 5, 6].map((level) => {
            const levelRules = byLevel[level] ?? [];
            if (levelRules.length === 0) return null;
            return (
              <div key={level}>
                <h3 className="text-sm font-medium text-neutral-300 mb-2">
                  {classType === "caster" ? `Circle ${level}` : `Level ${level}`}
                </h3>
                <ul className="space-y-2">
                  {levelRules.map((rule, idx) => (
                    <RuleItem
                      key={`${level}-${rule.spell_id}-${rule.source_type}-${idx}`}
                      rule={rule}
                      classType={classType}
                    />
                  ))}
                </ul>
              </div>
            );
          })}
        </>
      )}
    </section>
  );
}
