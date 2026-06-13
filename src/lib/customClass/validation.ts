import {
  MARTIAL_SOURCE_TYPES,
  PICK_SOURCE_TYPES,
  isLookThePartRule,
  type CustomClassSpellRuleRow,
  type CustomClassType,
  type CustomClassWizardPayload,
} from "@/lib/customClass/types";

export type ValidationResult = { ok: true } | { ok: false; message: string };

function isPickSourceType(sourceType: string): boolean {
  return (PICK_SOURCE_TYPES as readonly string[]).includes(sourceType);
}

export function validateCustomClassPayload(payload: CustomClassWizardPayload): ValidationResult {
  const name = payload.name?.trim() ?? "";
  if (!name) return { ok: false, message: "Name is required" };

  if (payload.class_type !== "martial" && payload.class_type !== "caster") {
    return { ok: false, message: "Class type must be martial or caster" };
  }

  const rules = payload.rules ?? [];
  for (const rule of rules) {
    const r = validateRule(rule, payload.class_type);
    if (!r.ok) return r;
  }

  if (payload.class_type === "martial") {
    const pickValidation = validateMartialPickGroups(rules);
    if (!pickValidation.ok) return pickValidation;
  }

  return { ok: true };
}

function validateRule(rule: CustomClassSpellRuleRow, classType: CustomClassType): ValidationResult {
  if (rule.spell_level < 1 || rule.spell_level > 6) {
    return { ok: false, message: "Each ability must be on a level between 1 and 6" };
  }
  if (!rule.spell_id || rule.spell_id < 1) {
    return { ok: false, message: "Each ability must reference a spell" };
  }
  if (rule.spell_kind !== "canonical" && rule.spell_kind !== "custom") {
    return { ok: false, message: "Invalid spell reference kind" };
  }

  if (classType === "caster") {
    if (rule.source_type !== "level_spell") {
      return { ok: false, message: "Caster abilities must use level_spell source type" };
    }
    if (rule.cost < 0) return { ok: false, message: "Caster spell cost cannot be negative" };
    return { ok: true };
  }

  if (!(MARTIAL_SOURCE_TYPES as readonly string[]).includes(rule.source_type)) {
    return { ok: false, message: `Invalid martial source type: ${rule.source_type}` };
  }
  if (rule.cost !== 0) {
    return { ok: false, message: "Martial abilities must have cost 0" };
  }
  return { ok: true };
}

export function validateMartialPickGroups(rules: CustomClassSpellRuleRow[]): ValidationResult {
  const pickRules = rules.filter((r) => isPickSourceType(r.source_type));
  if (pickRules.length === 0) return { ok: true };

  const byGroup = new Map<string, CustomClassSpellRuleRow[]>();
  for (const rule of pickRules) {
    const group = rule.option_group?.trim();
    if (!group) {
      return { ok: false, message: "Pick-type abilities must belong to an option group" };
    }
    const list = byGroup.get(group) ?? [];
    list.push(rule);
    byGroup.set(group, list);
  }

  for (const [group, members] of byGroup) {
    const sourceType = members[0]?.source_type;
    if (sourceType === "pick_two_of_three" && members.length !== 3) {
      return {
        ok: false,
        message: `Pick two of three group "${group}" must have exactly 3 options (has ${members.length})`,
      };
    }
    if (sourceType !== "pick_two_of_three" && members.length < 2) {
      return {
        ok: false,
        message: `Pick-one group "${group}" must have at least 2 options (has ${members.length})`,
      };
    }
  }

  return { ok: true };
}

export function validateWizardTab(
  tab: number,
  state: {
    name: string;
    classType: CustomClassType;
    rules: CustomClassSpellRuleRow[];
    lookThePartIncluded?: boolean;
  }
): ValidationResult {
  if (tab === 0) {
    if (!state.name.trim()) return { ok: false, message: "Name is required" };
    return { ok: true };
  }
  if (tab === 2) {
    const baseRules = state.rules.filter((r) => !isLookThePartRule(r));
    const ltpRules = state.rules.filter(isLookThePartRule);
    if (baseRules.length === 0 && !state.lookThePartIncluded) {
      return { ok: false, message: "Add at least one ability by level" };
    }
    if (baseRules.length > 0) {
      const incompleteBase = baseRules.some((r) => !r.spell_id || r.spell_id < 1);
      if (incompleteBase) {
        return { ok: false, message: "Each ability must have a spell selected" };
      }
    }
    if (state.classType === "martial" && state.lookThePartIncluded) {
      if (ltpRules.length === 0) {
        return {
          ok: false,
          message: "Add at least one Look the Part ability, or set Look the Part to Not included",
        };
      }
      const incompleteLtp = ltpRules.some((r) => !r.spell_id || r.spell_id < 1);
      if (incompleteLtp) {
        return { ok: false, message: "Each Look the Part ability must have a spell selected" };
      }
    }
    if (state.classType === "caster" && state.rules.length === 0) {
      return { ok: false, message: "Add at least one spell" };
    }
    return { ok: true };
  }
  if (tab === 3 && state.classType === "martial") {
    return validateMartialPickGroups(state.rules);
  }
  return { ok: true };
}
