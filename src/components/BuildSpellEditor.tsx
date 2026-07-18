"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { BuildSpellSelectionRow, SpellRow } from "@/lib/spellbook/types";
import SpellDetailModal from "@/components/spellbook/SpellDetailModal";
import TipsAlert from "@/components/spellbook/TipsAlert";
import {
  buildPurchasedCountBySpellNameFromSelections,
  buildSelectedSpellNameSet,
  applyDisplayRuleToSpell,
  computeDisplayRuleOverrides,
  type DisplayRuleResult,
  evaluateSpellRules,
} from "@/lib/spellbook/rules";
import {
  casterCascadeBudgetHolds,
  isCasterClass,
  POINTS_PER_SPELL_LEVEL,
  remainingPointsForCircleAndAbove,
} from "@/lib/spellbook/casterBudget";
import {
  catalogRuleKey,
  findSpellForSelection,
  selectionKeyForCatalogSpell,
  selectionKeyFromRow,
  spellRefFieldsFromRow,
} from "@/lib/spellbook/selection";
import {
  ARCHER_LTP_SPECIALTY_PICK_ONE_GROUP_KEY,
  buildMartialAutoSelections,
  filterArchetypeRestrictedSelections,
  getPickTwoOfThreeGroups,
  isLookThePartPickOneGroup,
  isMartialClass,
  isPickTwoOfThreeSpell,
  isRequiredPickOneGroupSatisfied,
  getPickOneGroups,
} from "@/lib/spellbook/martial";
import {
  ARTIFICER_LTP_PINNING_SELECTION_GROUP,
  RAIDER_LTP_BRUTAL_STRIKE_SELECTION_GROUP,
  SNIPER_LTP_MEND_SELECTION_GROUP,
} from "@/lib/spellbook/archetypeGrantedSpells";
import {
  buildExperiencedChargeSuffixByTargetKey,
  collectAllExperiencedTargetKeys,
  EXPERIENCED_TARGET_KEYS,
  isExperiencedCatalogSpell,
  listExperiencedPickerOptions,
  readExperiencedTargetKeys,
  validateExperiencedState,
} from "@/lib/spellbook/experienced";

/** Long-press (ms) to open spell detail modal. */
const LONG_PRESS_MS = 1000;

type Props = {
  buildId: number;
  className: string;
  maxLevel: number;
  /** Look the Part: casters get +1 point at the build’s highest spell circle. */
  lookThePart: boolean;
  /** From profile: whether to show spellbook tips (e.g. long-press hint). */
  spellbookTipsEnabled: boolean;
  /** From profile: whether long-press opens spell details. */
  spellDetailLongPressEnabled?: boolean;
  spells: SpellRow[];
  initialSelections: BuildSpellSelectionRow[];
  /** Synthetic archetype-grant rows (view-only); not persisted from this editor. */
  extraSelections?: BuildSpellSelectionRow[];
  initialShowTypeSchool?: boolean;
  initialShowIncantation?: boolean;
  initialShowMaterials?: boolean;
  initialShowRange?: boolean;
  editorMode?: "official" | "custom";
  classType?: "martial" | "caster";
  saveSelectionsUrl?: string;
  redirectAfterSave?: string;
};

type Selection = {
  spell_id: number;
  spell_level: number;
  purchased: number;
  experienced: number;
  selection_group: string | null;
  chosen: boolean;
  metadata?: Record<string, unknown>;
  custom_spell_id?: number | null;
  spell_kind?: "canonical" | "custom";
};

function purchasedBySpellIdFromMap(map: Record<string, Selection>) {
  const m: Record<number, number> = {};
  for (const sel of Object.values(map)) {
    m[sel.spell_id] = (m[sel.spell_id] ?? 0) + sel.purchased;
  }
  return m;
}

function mergePurchasedBySpellId(
  map: Record<string, Selection>,
  extras: BuildSpellSelectionRow[]
): Record<number, number> {
  const m = purchasedBySpellIdFromMap(map);
  for (const row of extras) {
    if (row.purchased <= 0) continue;
    m[row.spell_id] = (m[row.spell_id] ?? 0) + row.purchased;
  }
  return m;
}

function ruleContextForMap(map: Record<string, Selection>, spells: SpellRow[]) {
  return {
    purchasedCountBySpellName: buildPurchasedCountBySpellNameFromSelections(
      Object.values(map),
      spells
    ),
  };
}

function pointsSpentForMap(map: Record<string, Selection>, spells: SpellRow[]) {
  const names = buildSelectedSpellNameSet(purchasedBySpellIdFromMap(map), spells);
  const ctx = ruleContextForMap(map, spells);
  let sum = 0;
  for (const sel of Object.values(map)) {
    const spell = findSpellForSelection(spells, sel);
    if (!spell) continue;
    const ev = evaluateSpellRules(spell, names, ctx);
    sum += ev.adjustedCost * sel.purchased;
  }
  return sum;
}

function pointsSpentAtSpellLevel(map: Record<string, Selection>, spells: SpellRow[], spellLevel: number) {
  const names = buildSelectedSpellNameSet(purchasedBySpellIdFromMap(map), spells);
  const ctx = ruleContextForMap(map, spells);
  let sum = 0;
  for (const sel of Object.values(map)) {
    if (sel.spell_level !== spellLevel) continue;
    const spell = findSpellForSelection(spells, sel);
    if (!spell) continue;
    const ev = evaluateSpellRules(spell, names, ctx);
    sum += ev.adjustedCost * sel.purchased;
  }
  return sum;
}

export default function BuildSpellEditor({
  buildId,
  className,
  maxLevel,
  lookThePart,
  spellbookTipsEnabled,
  spellDetailLongPressEnabled = true,
  spells,
  initialSelections,
  extraSelections = [],
  initialShowTypeSchool = false,
  initialShowIncantation = false,
  initialShowMaterials = false,
  initialShowRange = false,
  editorMode = "official",
  classType,
  saveSelectionsUrl,
  redirectAfterSave,
}: Props) {
  const router = useRouter();
  const isCustomEditor = editorMode === "custom";
  const martial =
    isCustomEditor && classType != null ? classType === "martial" : isMartialClass(className);
  const caster =
    isCustomEditor && classType != null ? classType === "caster" : isCasterClass(className);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedSpell, setSelectedSpell] = useState<SpellRow | null>(null);
  const [showTypeSchool, setShowTypeSchool] = useState(initialShowTypeSchool);
  const [showIncantation, setShowIncantation] = useState(initialShowIncantation);
  const [showMaterials, setShowMaterials] = useState(initialShowMaterials);
  const [showRange, setShowRange] = useState(initialShowRange);
  const [ruleWarning, setRuleWarning] = useState<string>("");
  const [collapsedLevels, setCollapsedLevels] = useState<Set<number>>(() => new Set());
  /** Collapsed section keys (e.g. "ltp"); empty set = all expanded — matches view-build spell details. */
  const [collapsedSectionKeys, setCollapsedSectionKeys] = useState<Set<string>>(() => new Set());

  const [selectionMap, setSelectionMap] = useState<Record<string, Selection>>(() => {
    const selectionInput = initialSelections.map((s) => {
      const ext = s as BuildSpellSelectionRow & {
        custom_spell_id?: number | null;
        spell_kind?: "canonical" | "custom";
      };
      return {
        build_id: buildId,
        spell_id: s.spell_id,
        spell_level: s.spell_level,
        purchased: s.purchased,
        experienced: s.experienced,
        selection_group: s.selection_group,
        chosen: s.chosen,
        custom_spell_id: ext.custom_spell_id ?? null,
        spell_kind: ext.spell_kind ?? (ext.custom_spell_id != null ? "custom" : "canonical"),
      };
    });
    if (martial) {
      const auto = buildMartialAutoSelections(spells, lookThePart, className, selectionInput);
      const autoBase: Record<string, Selection> = {};
      for (const s of auto) {
        const key = s.selection_group ?? `${s.spell_level}:${s.spell_id}`;
        const ext = s as typeof s & { custom_spell_id?: number | null; spell_kind?: "canonical" | "custom" };
        autoBase[key] = {
          spell_id: s.spell_id,
          spell_level: s.spell_level,
          purchased: 1,
          experienced: 0,
          selection_group: s.selection_group,
          chosen: true,
          custom_spell_id: ext.custom_spell_id ?? null,
          spell_kind: ext.spell_kind,
        };
      }
      return autoBase;
    }
    const base: Record<string, Selection> = {};
    for (const s of initialSelections) {
      const ext = s as BuildSpellSelectionRow & {
        custom_spell_id?: number | null;
        spell_kind?: "canonical" | "custom";
      };
      base[selectionKeyFromRow(s)] = {
        spell_id: s.spell_id,
        spell_level: s.spell_level,
        purchased: s.purchased,
        experienced: s.experienced,
        selection_group: s.selection_group,
        chosen: s.chosen,
        metadata: s.metadata && typeof s.metadata === "object" ? { ...s.metadata } : {},
        custom_spell_id: ext.custom_spell_id ?? null,
        spell_kind: ext.spell_kind ?? (ext.custom_spell_id != null ? "custom" : "canonical"),
      };
    }
    return base;
  });

  const grouped = useMemo(() => {
    const byLevel: Record<number, SpellRow[]> = {};
    for (let i = 1; i <= maxLevel; i += 1) byLevel[i] = [];
    for (const spell of spells) {
      const level = spell.level ?? 1;
      if (level >= 1 && level <= maxLevel) {
        byLevel[level].push(spell);
      }
    }
    return byLevel;
  }, [maxLevel, spells]);

  const casterLtpBonus = caster && lookThePart ? 1 : 0;
  const totalBudget = useMemo(
    () => maxLevel * POINTS_PER_SPELL_LEVEL + casterLtpBonus,
    [maxLevel, casterLtpBonus]
  );
  const pointsSpentBySpellLevel = useMemo(() => {
    const out: Record<number, number> = {};
    for (let L = 1; L <= maxLevel; L += 1) {
      out[L] = pointsSpentAtSpellLevel(selectionMap, spells, L);
    }
    return out;
  }, [selectionMap, spells, maxLevel]);
  const purchasedBySpellId = useMemo(
    () => mergePurchasedBySpellId(selectionMap, extraSelections),
    [selectionMap, extraSelections]
  );
  const pointsSpent = useMemo(
    () => pointsSpentForMap(selectionMap, spells),
    [selectionMap, spells]
  );
  const pointsRemaining = Math.max(totalBudget - pointsSpent, 0);
  const selectedSpellNames = useMemo(
    () => buildSelectedSpellNameSet(purchasedBySpellId, spells),
    [purchasedBySpellId, spells]
  );
  const ruleContext = useMemo(
    () => ruleContextForMap(selectionMap, spells),
    [selectionMap, spells]
  );

  type ExperiencedPickerOpen = {
    experiencedMapKey: string;
    nextPurchased: number;
    spell: SpellRow;
    level: number;
  };
  const [experiencedPicker, setExperiencedPicker] = useState<ExperiencedPickerOpen | null>(null);

  const selectionsAsRowsForExperienced = useMemo((): BuildSpellSelectionRow[] => {
    return Object.values(selectionMap).map((s) => ({
      id: 0,
      build_id: buildId,
      spell_id: s.spell_id,
      spell_level: s.spell_level,
      purchased: s.purchased,
      experienced: s.experienced,
      selection_group: s.selection_group,
      chosen: s.chosen,
      metadata: s.metadata ?? {},
    }));
  }, [selectionMap, buildId]);

  const experiencedSuffixByTargetKey = useMemo(
    () => buildExperiencedChargeSuffixByTargetKey(selectionsAsRowsForExperienced, spells),
    [selectionsAsRowsForExperienced, spells]
  );

  const experiencedStateValid = useMemo(
    () => validateExperiencedState(selectionsAsRowsForExperienced, spells),
    [selectionsAsRowsForExperienced, spells]
  );

  const experiencedPickerOptions = useMemo(() => {
    if (!experiencedPicker) return [];
    const exclude = collectAllExperiencedTargetKeys(selectionsAsRowsForExperienced, spells);
    return listExperiencedPickerOptions(selectionsAsRowsForExperienced, spells, exclude);
  }, [experiencedPicker, selectionsAsRowsForExperienced, spells]);

  const hideArcherSniperLtpPickOne = className === "Archer" && selectedSpellNames.has("Sniper");
  const hideArcherArtificerLtpPickOne = className === "Archer" && selectedSpellNames.has("Artificer");
  const hideBarbarianRaiderLtp = className === "Barbarian" && selectedSpellNames.has("Raider");
  const hideArcherArtificerPickTwo = hideArcherArtificerLtpPickOne;
  const hideArcherLtpSpecialtyPickOne = hideArcherSniperLtpPickOne || hideArcherArtificerLtpPickOne;
  const visibleArchetypeGrants = useMemo(
    () =>
      extraSelections.filter(
        (s) =>
          s.purchased > 0 &&
          s.selection_group !== SNIPER_LTP_MEND_SELECTION_GROUP &&
          s.selection_group !== ARTIFICER_LTP_PINNING_SELECTION_GROUP &&
          s.selection_group !== RAIDER_LTP_BRUTAL_STRIKE_SELECTION_GROUP
      ),
    [extraSelections]
  );
  const lookThePartMendGrantRows = useMemo(
    () =>
      hideArcherSniperLtpPickOne && lookThePart
        ? extraSelections.filter(
            (s) => s.purchased > 0 && s.selection_group === SNIPER_LTP_MEND_SELECTION_GROUP
          )
        : [],
    [extraSelections, hideArcherSniperLtpPickOne, lookThePart]
  );
  const lookThePartPinningGrantRows = useMemo(
    () =>
      hideArcherArtificerLtpPickOne && lookThePart
        ? extraSelections.filter(
            (s) => s.purchased > 0 && s.selection_group === ARTIFICER_LTP_PINNING_SELECTION_GROUP
          )
        : [],
    [extraSelections, hideArcherArtificerLtpPickOne, lookThePart]
  );
  const lookThePartBrutalGrantRows = useMemo(
    () =>
      hideBarbarianRaiderLtp && lookThePart
        ? extraSelections.filter(
            (s) => s.purchased > 0 && s.selection_group === RAIDER_LTP_BRUTAL_STRIKE_SELECTION_GROUP
          )
        : [],
    [extraSelections, hideBarbarianRaiderLtp, lookThePart]
  );
  const pickOneGroups = useMemo(() => {
    const selectedRuleIds = new Set<number>();
    for (const [key, value] of Object.entries(selectionMap)) {
      if (!key.startsWith("csr:") || value.purchased <= 0) continue;
      const id = Number(key.slice(4));
      if (Number.isFinite(id)) selectedRuleIds.add(id);
    }
    return getPickOneGroups(spells, className, selectedRuleIds);
  }, [spells, className, selectionMap]);

  const pickTwoOfThreeGroups = useMemo(() => {
    const selectedRuleIds = new Set<number>();
    for (const [key, value] of Object.entries(selectionMap)) {
      if (!key.startsWith("csr:") || value.purchased <= 0) continue;
      const id = Number(key.slice(4));
      if (Number.isFinite(id)) selectedRuleIds.add(id);
    }
    return getPickTwoOfThreeGroups(spells, className, selectedRuleIds);
  }, [spells, className, selectionMap]);

  const pickOneGroupsForUI = useMemo(
    () =>
      hideArcherLtpSpecialtyPickOne
        ? pickOneGroups.filter((g) => g.groupKey !== ARCHER_LTP_SPECIALTY_PICK_ONE_GROUP_KEY)
        : pickOneGroups,
    [pickOneGroups, hideArcherLtpSpecialtyPickOne]
  );

  const pickTwoOfThreeGroupsForUI = useMemo(
    () => (hideArcherArtificerPickTwo ? [] : pickTwoOfThreeGroups),
    [pickTwoOfThreeGroups, hideArcherArtificerPickTwo]
  );

  const lookThePartPickOneGroups = useMemo(
    () => pickOneGroupsForUI.filter((g) => isLookThePartPickOneGroup(g)),
    [pickOneGroupsForUI]
  );

  const lookThePartPickOneRuleIds = useMemo(() => {
    const s = new Set<number>();
    for (const g of lookThePartPickOneGroups) {
      for (const opt of g.options) {
        if (opt.catalog_rule_id != null) s.add(opt.catalog_rule_id);
      }
    }
    return s;
  }, [lookThePartPickOneGroups]);

  const lookThePartRows = useMemo(() => {
    if (!martial || !lookThePart) return [];
    const out: { mapKey: string; spell: SpellRow; purchased: number }[] = [];
    for (const [mapKey, sel] of Object.entries(selectionMap)) {
      if (sel.purchased <= 0) continue;
      const spell = findSpellForSelection(spells, sel);
      if (!spell) continue;
      if (
        hideArcherLtpSpecialtyPickOne &&
        spell.option_group === "archer:look_the_part"
      ) {
        continue;
      }
      if (hideBarbarianRaiderLtp && (spell.is_look_the_part || spell.source_type === "look_the_part")) {
        continue;
      }
      const isLtp = Boolean(spell.is_look_the_part || spell.source_type === "look_the_part");
      if (!isLtp) continue;
      const rid = spell.catalog_rule_id;
      if (rid != null && lookThePartPickOneRuleIds.has(rid)) continue;
      out.push({ mapKey, spell, purchased: sel.purchased });
    }
    out.sort((a, b) => a.spell.name.localeCompare(b.spell.name));
    return out;
  }, [
    selectionMap,
    spells,
    className,
    lookThePart,
    lookThePartPickOneRuleIds,
    hideArcherLtpSpecialtyPickOne,
    hideBarbarianRaiderLtp,
  ]);

  function toggleSectionCollapse(sectionKey: string) {
    setCollapsedSectionKeys((prev) => {
      const next = new Set(prev);
      if (next.has(sectionKey)) next.delete(sectionKey);
      else next.add(sectionKey);
      return next;
    });
  }

  function mapAcceptsBudget(nextMap: Record<string, Selection>, nonCasterSpellLevel: number): boolean {
    const spentAfter = pointsSpentForMap(nextMap, spells);
    if (spentAfter > totalBudget) return false;
    if (caster) {
      if (!casterCascadeBudgetHolds(nextMap, spells, maxLevel, casterLtpBonus)) return false;
    } else if (!martial) {
      const spentThisLevelAfter = pointsSpentAtSpellLevel(nextMap, spells, nonCasterSpellLevel);
      if (spentThisLevelAfter > POINTS_PER_SPELL_LEVEL) return false;
    }
    return true;
  }

  function displaySpellTitle(
    spell: SpellRow,
    purchased: number,
    opts?: { isExperiencedTarget?: boolean; displayTag?: string | null }
  ) {
    const type = spell.type ?? null;
    if (type === "Archetype") return `${spell.name} - (Archetype)`;
    if (type === "Trait") return `${spell.name} - (Trait)`;
    if (opts?.isExperiencedTarget) return `${purchased}x ${spell.name} - (Experienced)`;
    if (opts?.displayTag) return `${purchased}x ${spell.name} - (${opts.displayTag})`;
    return `${purchased}x ${spell.name}`;
  }

  function applyExperiencedTargetChoice(picker: ExperiencedPickerOpen, targetKey: string) {
    setSelectionMap((prev) => {
      const cur = prev[picker.experiencedMapKey];
      const group =
        picker.spell.catalog_rule_id != null ? catalogRuleKey(picker.spell.catalog_rule_id) : null;
      const prevKeys = readExperiencedTargetKeys(cur?.metadata);
      const nextRow: Selection = {
        ...spellRefFieldsFromRow(picker.spell),
        spell_level: picker.level,
        purchased: picker.nextPurchased,
        experienced: cur?.experienced ?? 0,
        selection_group: cur?.selection_group ?? group,
        chosen: true,
        metadata: {
          ...(cur?.metadata ?? {}),
          [EXPERIENCED_TARGET_KEYS]: [...prevKeys, targetKey],
        },
      };
      return {
        ...prev,
        [picker.experiencedMapKey]: nextRow,
      };
    });
    setExperiencedPicker(null);
  }

  function increment(spell: SpellRow, level: number) {
    if (martial) return;
    const evaluated = evaluateSpellRules(spell, selectedSpellNames, {
      ...ruleContext,
      prospectiveAdditionalPurchases: 1,
    });
    if (evaluated.restricted) {
      setRuleWarning(evaluated.reason ?? "Spell restricted by active archetype limitations.");
      return;
    }

    const key = selectionKeyForCatalogSpell(spell);
    const max = spell.max ?? 99;
    const group =
      spell.catalog_rule_id != null ? catalogRuleKey(spell.catalog_rule_id) : null;
    const existing = selectionMap[key];
    const nextPurchased = Math.min((existing?.purchased ?? 0) + 1, max);
    if (nextPurchased === (existing?.purchased ?? 0)) return;

    if (isExperiencedCatalogSpell(spell)) {
      const nextMap: Record<string, Selection> = {
        ...selectionMap,
        [key]: {
          ...spellRefFieldsFromRow(spell),
          spell_level: level,
          purchased: nextPurchased,
          experienced: existing?.experienced ?? 0,
          selection_group: existing?.selection_group ?? group,
          chosen: true,
          metadata: { ...(existing?.metadata ?? {}) },
        },
      };
      if (!mapAcceptsBudget(nextMap, level)) {
        setRuleWarning("Not enough points or circle budget for this purchase.");
        return;
      }
      setExperiencedPicker({
        experiencedMapKey: key,
        nextPurchased,
        spell,
        level,
      });
      return;
    }

    setSelectionMap((prev) => {
      const ex = prev[key];
      const purchased = Math.min((ex?.purchased ?? 0) + 1, max);
      const nextMap = {
        ...prev,
        [key]: {
          ...spellRefFieldsFromRow(spell),
          spell_level: level,
          purchased,
          experienced: ex?.experienced ?? 0,
          selection_group: ex?.selection_group ?? group,
          chosen: purchased > 0,
          metadata: { ...(ex?.metadata ?? {}) },
        },
      };
      if (!mapAcceptsBudget(nextMap, level)) return prev;
      return nextMap;
    });
  }

  function decrement(spell: SpellRow) {
    if (martial) return;
    const key = selectionKeyForCatalogSpell(spell);
    setSelectionMap((prev) => {
      const existing = prev[key];
      if (!existing) return prev;
      const purchased = Math.max(existing.purchased - 1, 0);
      if (purchased === 0) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      let metadata: Record<string, unknown> = { ...(existing.metadata ?? {}) };
      if (isExperiencedCatalogSpell(spell)) {
        const keys = readExperiencedTargetKeys(metadata);
        keys.pop();
        if (keys.length === 0) {
          delete metadata[EXPERIENCED_TARGET_KEYS];
        } else {
          metadata = { ...metadata, [EXPERIENCED_TARGET_KEYS]: keys };
        }
      }
      return {
        ...prev,
        [key]: { ...existing, purchased, metadata },
      };
    });
  }

  function applyArchetypeFilterToMap(map: Record<string, Selection>): Record<string, Selection> {
    const rows = Object.values(map).map((s) => ({
      build_id: buildId,
      spell_id: s.spell_id,
      spell_level: s.spell_level,
      purchased: s.purchased,
      experienced: s.experienced,
      selection_group: s.selection_group,
      chosen: s.chosen,
      metadata: s.metadata ?? {},
    }));
    const filtered = filterArchetypeRestrictedSelections(rows, spells);
    const out: Record<string, Selection> = {};
    for (const s of filtered) {
      const key = s.selection_group ?? `${s.spell_level}:${s.spell_id}`;
      out[key] = {
        spell_id: s.spell_id,
        spell_level: s.spell_level,
        purchased: s.purchased,
        experienced: s.experienced,
        selection_group: s.selection_group,
        chosen: s.chosen,
        metadata: s.metadata && typeof s.metadata === "object" ? { ...s.metadata } : {},
      };
    }
    return out;
  }

  function choosePickOne(groupKey: string, chosenCatalogRuleId: number) {
    setSelectionMap((prev) => {
      const next = { ...prev };
      const groupOptions =
        pickOneGroupsForUI.find((g) => g.groupKey === groupKey)?.options ?? [];
      for (const option of groupOptions) {
        if (option.catalog_rule_id == null) continue;
        const key = catalogRuleKey(option.catalog_rule_id);
        delete next[key];
      }
      const chosen = groupOptions.find((o) => o.catalog_rule_id === chosenCatalogRuleId);
      if (chosen?.catalog_rule_id != null) {
        const key = catalogRuleKey(chosen.catalog_rule_id);
        next[key] = {
          ...spellRefFieldsFromRow(chosen),
          spell_level: chosen.level ?? 1,
          purchased: 1,
          experienced: 0,
          selection_group: key,
          chosen: true,
          metadata: {},
        };
      }
      if (chosen?.type === "Archetype") {
        for (const spell of spells) {
          if (spell.option_group?.startsWith(`${chosen.id}:pickOne`) && spell.catalog_rule_id != null) {
            delete next[catalogRuleKey(spell.catalog_rule_id)];
          }
        }
      }
      return applyArchetypeFilterToMap(next);
    });
  }

  function togglePickTwoOfThree(groupOptions: SpellRow[], catalogRuleId: number, checked: boolean) {
    setSelectionMap((prev) => {
      const key = catalogRuleKey(catalogRuleId);
      const next = { ...prev };
      if (!checked) {
        delete next[key];
        return next;
      }
      const selectedInGroup = groupOptions.filter(
        (o) =>
          o.catalog_rule_id != null &&
          prev[catalogRuleKey(o.catalog_rule_id)]?.purchased > 0
      );
      if (selectedInGroup.length >= 2) return prev;
      const opt = groupOptions.find((o) => o.catalog_rule_id === catalogRuleId);
      if (!opt) return prev;
      next[key] = {
        ...spellRefFieldsFromRow(opt),
        spell_level: opt.level ?? 1,
        purchased: 1,
        experienced: 0,
        selection_group: key,
        chosen: true,
        metadata: {},
      };
      return next;
    });
  }

  async function saveSelections() {
    setSaving(true);
    setError("");
    if (!experiencedStateValid.ok) {
      setError(experiencedStateValid.message);
      setSaving(false);
      return;
    }
    const payload = Object.values(selectionMap)
      .filter((s) => !s.selection_group?.startsWith("archetype-grant:"))
      .map((s) => ({
        build_id: buildId,
        spell_id: s.spell_id,
        spell_level: s.spell_level,
        purchased: s.purchased,
        experienced: s.experienced,
        selection_group: s.selection_group,
        chosen: s.chosen,
        metadata: s.metadata ?? {},
        custom_spell_id: s.custom_spell_id ?? null,
        spell_kind: s.spell_kind ?? (s.custom_spell_id != null ? "custom" : "canonical"),
      }));

    const url = saveSelectionsUrl ?? `/api/builds/${buildId}/spells`;
    const response = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selections: payload }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Failed to Save Selections");
      setSaving(false);
      return;
    }

    setSaving(false);
    router.push(redirectAfterSave ?? `/builds/${buildId}`);
    router.refresh();
  }

  function startLongPress(spell: SpellRow, display?: DisplayRuleResult) {
    if (!spellDetailLongPressEnabled) return null;
    const detailSpell = display ? applyDisplayRuleToSpell(spell, display) : spell;
    const timeout = setTimeout(() => setSelectedSpell(detailSpell), LONG_PRESS_MS);
    return timeout;
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      {caster ? (
        <div
          className={
            pointsRemaining === 0
              ? "sticky top-[var(--metagard-top-nav-offset)] z-30 flex justify-center border-b border-green-700 bg-green-600/95 py-2 px-4 backdrop-blur"
              : "sticky top-[var(--metagard-top-nav-offset)] z-30 flex justify-center border-b border-neutral-800 bg-neutral-900/95 py-2 px-4 backdrop-blur"
          }
          aria-live="polite"
        >
          {pointsRemaining === 0 ? (
            <p className="text-sm font-semibold text-white">All Points Spent</p>
          ) : (
            <p className="text-sm text-neutral-200 tabular-nums">
              Points Remaining: <span className="font-semibold text-white">{pointsRemaining}</span>
            </p>
          )}
        </div>
      ) : null}
      <TipsAlert
        tipsEnabled={spellbookTipsEnabled}
        message="Long Press a Spell Row to View Detailed Spell Text, Restrictions, and Notes"
      />
      <SpellDetailModal spell={selectedSpell} onClose={() => setSelectedSpell(null)} />
      {experiencedPicker ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="experienced-picker-title"
        >
          <div className="w-full max-w-md rounded-lg border border-neutral-700 bg-neutral-900 p-4 shadow-xl">
            <h2 id="experienced-picker-title" className="text-lg font-semibold text-white">
              Choose verbal for Experienced
            </h2>
            <p className="mt-2 text-sm text-neutral-400">
              Pick one per-Life or per-Refresh Verbal (circle 4 or below) on this build. Each verbal can only be chosen once.
            </p>
            {experiencedPickerOptions.length === 0 ? (
              <p className="mt-3 text-sm text-amber-200">
                No eligible verbals on this build. Add a qualifying Verbal before purchasing Experienced.
              </p>
            ) : (
              <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto">
                {experiencedPickerOptions.map((opt) => (
                  <li key={opt.targetKey}>
                    <button
                      type="button"
                      className="w-full rounded border border-neutral-700 px-3 py-2 text-left text-sm text-neutral-100 hover:bg-neutral-800"
                      onClick={() => applyExperiencedTargetChoice(experiencedPicker, opt.targetKey)}
                    >
                      {opt.spell.name}
                      <span className="block text-xs text-neutral-500">
                        Circle {opt.spell.level ?? "—"} · {opt.spell.school ?? "—"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded bg-neutral-700 px-3 py-2 text-sm"
                onClick={() => setExperiencedPicker(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {ruleWarning ? (
        <div className="rounded border border-amber-800 bg-amber-950/30 p-3 text-sm text-amber-200">
          <div className="flex items-start justify-between gap-3">
            <p>{ruleWarning}</p>
            <button className="px-2 py-1 bg-amber-800 rounded" onClick={() => setRuleWarning("")}>
              Dismiss
            </button>
          </div>
        </div>
      ) : null}
      <div className="rounded border border-neutral-800 p-3 sm:p-4 bg-neutral-900/40">
        {martial ? (
          <p className="text-sm text-neutral-300">
            Martial Class Build: Point-Buy Is Disabled. Abilities Are Automatically Assigned by Class/Level.
            {lookThePart ? " Look the Part Bonus Ability Is Included." : " Enable Look the Part in Settings to Include the LTP Ability."}
          </p>
        ) : (
          <p className="text-sm text-neutral-300">
            Points: <span className="font-semibold">{pointsSpent}</span> Spent /{" "}
            <span className="font-semibold">{totalBudget}</span> Total /{" "}
            <span className="font-semibold">{pointsRemaining}</span> Remaining
          </p>
        )}
        {caster ? (
          <p className="mt-2 text-xs text-neutral-500">
            Caster: Unused Points from Higher Circles Can Be Spent on Lower-Circle Spells (up to {POINTS_PER_SPELL_LEVEL}{" "}
            Pts per Circle into the Shared Pool).
            {lookThePart ? (
              <>
                {" "}
                Look the Part Adds +1 Pt at Circle {maxLevel} (Total {totalBudget}).
              </>
            ) : null}
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-3 sm:gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={showTypeSchool} onChange={(e) => setShowTypeSchool(e.target.checked)} />
            Show Type/School
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={showIncantation} onChange={(e) => setShowIncantation(e.target.checked)} />
            Show Incantation
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={showMaterials} onChange={(e) => setShowMaterials(e.target.checked)} />
            Show Materials
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={showRange} onChange={(e) => setShowRange(e.target.checked)} />
            Show Range
          </label>
        </div>
      </div>

      {martial &&
      lookThePart &&
      (lookThePartRows.length > 0 ||
        lookThePartPickOneGroups.length > 0 ||
        lookThePartMendGrantRows.length > 0 ||
        lookThePartPinningGrantRows.length > 0 ||
        lookThePartBrutalGrantRows.length > 0) ? (
        <section className="border border-neutral-800 rounded-lg p-3 sm:p-4">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 text-left rounded-md px-1 py-2 -mx-1 hover:bg-neutral-800/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            onClick={() => toggleSectionCollapse("ltp")}
            aria-expanded={!collapsedSectionKeys.has("ltp")}
          >
            <h2 className="text-lg font-semibold">Look the Part</h2>
            <span className="shrink-0 text-neutral-500 text-sm" aria-hidden>
              {collapsedSectionKeys.has("ltp") ? "▶" : "▼"}
            </span>
          </button>
          {!collapsedSectionKeys.has("ltp") ? (
            <div className="space-y-2 mt-2">
              {lookThePartPickOneGroups.map((group, idx) => {
                const chosen = group.options.find((opt) =>
                  opt.catalog_rule_id != null && selectionMap[catalogRuleKey(opt.catalog_rule_id)]?.purchased > 0
                );
                return (
                  <div key={group.groupKey} className="rounded border border-neutral-800 p-3">
                    <p className="text-sm text-neutral-300">
                      {group.optionalMartialArchetype
                        ? "Optional (Martial Archetype): Pick One Look the Part Ability:"
                        : "Pick One Look the Part Ability:"}
                    </p>
                    <p className="text-xs text-neutral-500 mb-2">
                      {group.requiredForMartial ? "Required for martial builds." : "Optional choice."}
                    </p>
                    <select
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-sm"
                      value={chosen?.catalog_rule_id != null ? String(chosen.catalog_rule_id) : ""}
                      onChange={(e) => choosePickOne(group.groupKey, Number(e.target.value))}
                    >
                      <option value="">
                        {group.optionalMartialArchetype ? "No Archetype" : "Select One"}
                      </option>
                      {group.options.map((opt) => (
                        <option key={opt.catalog_rule_id ?? `${opt.id}-${idx}`} value={opt.catalog_rule_id ?? ""}>
                          {opt.name}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
              {lookThePartMendGrantRows.map((row) => {
                const spell = findSpellForSelection(spells, row);
                const purchased = row.purchased;
                const rowKey = selectionKeyFromRow(row);
                const expSuffix = experiencedSuffixByTargetKey.get(rowKey);
                const evaluated = spell ? evaluateSpellRules(spell, selectedSpellNames, ruleContext) : null;
                const display = spell
                  ? computeDisplayRuleOverrides(
                      spell,
                      selectedSpellNames,
                      purchased,
                      className,
                      expSuffix ? { experiencedChargeSuffix: expSuffix } : undefined
                    )
                  : { frequency: null, range: null, tag: null };
                let longPressTimeout: ReturnType<typeof setTimeout> | null = null;
                return (
                  <div
                    key={row.id}
                    className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded border p-2 sm:p-3 ${
                      evaluated?.restricted ? "border-red-800 bg-red-950/20" : "border-neutral-800"
                    }`}
                    onMouseDown={() => {
                      if (spell) longPressTimeout = startLongPress(spell, display);
                    }}
                    onMouseUp={() => {
                      if (longPressTimeout) clearTimeout(longPressTimeout);
                    }}
                    onMouseLeave={() => {
                      if (longPressTimeout) clearTimeout(longPressTimeout);
                    }}
                    onTouchStart={() => {
                      if (spell) longPressTimeout = startLongPress(spell, display);
                    }}
                    onTouchEnd={() => {
                      if (longPressTimeout) clearTimeout(longPressTimeout);
                    }}
                  >
                    <div>
                      <p className="font-medium">
                        {spell
                          ? displaySpellTitle(spell, purchased, {
                              isExperiencedTarget: experiencedSuffixByTargetKey.has(rowKey),
                              displayTag: display.tag,
                            })
                          : `Spell #${row.spell_id}`}
                      </p>
                      {spell ? (
                        <p className="text-xs text-neutral-400">
                          {showTypeSchool && spell.type ? `${spell.type}` : ""}
                          {showTypeSchool && spell.school ? ` (${spell.school})` : ""}
                          {showRange && display.range ? ` (${display.range})` : ""}
                        </p>
                      ) : null}
                      {display.frequency ? (
                        <p className="text-xs text-neutral-500 mt-1">{display.frequency}</p>
                      ) : null}
                      {evaluated?.restricted && evaluated.reason ? (
                        <p className="text-xs text-red-300 mt-1">{evaluated.reason}</p>
                      ) : null}
                      {showIncantation && spell?.incantation ? (
                        <p className="text-xs text-neutral-500 whitespace-pre-wrap mt-1">{spell.incantation}</p>
                      ) : null}
                      {showMaterials && spell?.materials ? (
                        <p className="text-xs text-neutral-500 mt-1">({spell.materials})</p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
              {lookThePartPinningGrantRows.map((row) => {
                const spell = findSpellForSelection(spells, row);
                const purchased = row.purchased;
                const rowKey = selectionKeyFromRow(row);
                const expSuffix = experiencedSuffixByTargetKey.get(rowKey);
                const evaluated = spell ? evaluateSpellRules(spell, selectedSpellNames, ruleContext) : null;
                const display = spell
                  ? computeDisplayRuleOverrides(
                      spell,
                      selectedSpellNames,
                      purchased,
                      className,
                      expSuffix ? { experiencedChargeSuffix: expSuffix } : undefined
                    )
                  : { frequency: null, range: null, tag: null };
                let longPressTimeout: ReturnType<typeof setTimeout> | null = null;
                return (
                  <div
                    key={row.id}
                    className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded border p-2 sm:p-3 ${
                      evaluated?.restricted ? "border-red-800 bg-red-950/20" : "border-neutral-800"
                    }`}
                    onMouseDown={() => {
                      if (spell) longPressTimeout = startLongPress(spell, display);
                    }}
                    onMouseUp={() => {
                      if (longPressTimeout) clearTimeout(longPressTimeout);
                    }}
                    onMouseLeave={() => {
                      if (longPressTimeout) clearTimeout(longPressTimeout);
                    }}
                    onTouchStart={() => {
                      if (spell) longPressTimeout = startLongPress(spell, display);
                    }}
                    onTouchEnd={() => {
                      if (longPressTimeout) clearTimeout(longPressTimeout);
                    }}
                  >
                    <div>
                      <p className="font-medium">
                        {spell
                          ? displaySpellTitle(spell, purchased, {
                              isExperiencedTarget: experiencedSuffixByTargetKey.has(rowKey),
                              displayTag: display.tag,
                            })
                          : `Spell #${row.spell_id}`}
                      </p>
                      {spell ? (
                        <p className="text-xs text-neutral-400">
                          {showTypeSchool && spell.type ? `${spell.type}` : ""}
                          {showTypeSchool && spell.school ? ` (${spell.school})` : ""}
                          {showRange && display.range ? ` (${display.range})` : ""}
                        </p>
                      ) : null}
                      {display.frequency ? (
                        <p className="text-xs text-neutral-500 mt-1">{display.frequency}</p>
                      ) : null}
                      {evaluated?.restricted && evaluated.reason ? (
                        <p className="text-xs text-red-300 mt-1">{evaluated.reason}</p>
                      ) : null}
                      {showIncantation && spell?.incantation ? (
                        <p className="text-xs text-neutral-500 whitespace-pre-wrap mt-1">{spell.incantation}</p>
                      ) : null}
                      {showMaterials && spell?.materials ? (
                        <p className="text-xs text-neutral-500 mt-1">({spell.materials})</p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
              {lookThePartBrutalGrantRows.map((row) => {
                const spell = findSpellForSelection(spells, row);
                const purchased = row.purchased;
                const rowKey = selectionKeyFromRow(row);
                const expSuffix = experiencedSuffixByTargetKey.get(rowKey);
                const evaluated = spell ? evaluateSpellRules(spell, selectedSpellNames, ruleContext) : null;
                const display = spell
                  ? computeDisplayRuleOverrides(
                      spell,
                      selectedSpellNames,
                      purchased,
                      className,
                      expSuffix ? { experiencedChargeSuffix: expSuffix } : undefined
                    )
                  : { frequency: null, range: null, tag: null };
                let longPressTimeout: ReturnType<typeof setTimeout> | null = null;
                return (
                  <div
                    key={row.id}
                    className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded border p-2 sm:p-3 ${
                      evaluated?.restricted ? "border-red-800 bg-red-950/20" : "border-neutral-800"
                    }`}
                    onMouseDown={() => {
                      if (spell) longPressTimeout = startLongPress(spell, display);
                    }}
                    onMouseUp={() => {
                      if (longPressTimeout) clearTimeout(longPressTimeout);
                    }}
                    onMouseLeave={() => {
                      if (longPressTimeout) clearTimeout(longPressTimeout);
                    }}
                    onTouchStart={() => {
                      if (spell) longPressTimeout = startLongPress(spell, display);
                    }}
                    onTouchEnd={() => {
                      if (longPressTimeout) clearTimeout(longPressTimeout);
                    }}
                  >
                    <div>
                      <p className="font-medium">
                        {spell
                          ? displaySpellTitle(spell, purchased, {
                              isExperiencedTarget: experiencedSuffixByTargetKey.has(rowKey),
                              displayTag: display.tag,
                            })
                          : `Spell #${row.spell_id}`}
                      </p>
                      {display.frequency ? (
                        <p className="text-xs text-neutral-500 mt-1">{display.frequency}</p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
              {lookThePartRows.map(({ mapKey, spell, purchased }) => {
                const evaluated = evaluateSpellRules(spell, selectedSpellNames, ruleContext);
                const expSuffix = experiencedSuffixByTargetKey.get(mapKey);
                const display = computeDisplayRuleOverrides(
                  spell,
                  selectedSpellNames,
                  purchased,
                  className,
                  expSuffix ? { experiencedChargeSuffix: expSuffix } : undefined
                );
                let longPressTimeout: ReturnType<typeof setTimeout> | null = null;
                return (
                  <div
                    key={mapKey}
                    className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded border p-2 sm:p-3 ${
                      evaluated.restricted ? "border-red-800 bg-red-950/20" : "border-neutral-800"
                    }`}
                    onMouseDown={() => {
                      longPressTimeout = startLongPress(spell);
                    }}
                    onMouseUp={() => {
                      if (longPressTimeout) clearTimeout(longPressTimeout);
                    }}
                    onMouseLeave={() => {
                      if (longPressTimeout) clearTimeout(longPressTimeout);
                    }}
                    onTouchStart={() => {
                      longPressTimeout = startLongPress(spell);
                    }}
                    onTouchEnd={() => {
                      if (longPressTimeout) clearTimeout(longPressTimeout);
                    }}
                  >
                    <div>
                      <p className="font-medium">
                        {displaySpellTitle(spell, purchased, {
                          isExperiencedTarget: experiencedSuffixByTargetKey.has(mapKey),
                          displayTag: display.tag,
                        })}
                      </p>
                      <p className="text-xs text-neutral-400">
                        {showTypeSchool && spell.type ? `${spell.type}` : ""}
                        {showTypeSchool && spell.school ? ` (${spell.school})` : ""}
                        {showRange && display.range ? ` (${display.range})` : ""}
                      </p>
                      {display.frequency ? (
                        <p className="text-xs text-neutral-500 mt-1">{display.frequency}</p>
                      ) : null}
                      {evaluated.restricted && evaluated.reason ? (
                        <p className="text-xs text-red-300 mt-1">{evaluated.reason}</p>
                      ) : null}
                      {showIncantation && spell.incantation ? (
                        <p className="text-xs text-neutral-500 whitespace-pre-wrap mt-1">{spell.incantation}</p>
                      ) : null}
                      {showMaterials && spell.materials ? (
                        <p className="text-xs text-neutral-500 mt-1">({spell.materials})</p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </section>
      ) : null}

      {pickOneGroupsForUI.length > 0 || pickTwoOfThreeGroupsForUI.length > 0 ? (
        <div className="hidden" />
      ) : null}

      {Array.from({ length: maxLevel }, (_, idx) => idx + 1).map((level) => {
        const spentHere = pointsSpentBySpellLevel[level] ?? 0;
        const remainingHere = caster
          ? remainingPointsForCircleAndAbove(
              selectionMap,
              spells,
              maxLevel,
              level,
              casterLtpBonus
            )
          : Math.max(POINTS_PER_SPELL_LEVEL - spentHere, 0);
        const collapsed = collapsedLevels.has(level);
        return (
        <section key={level} className="border border-neutral-800 rounded-lg p-3 sm:p-4">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 text-left rounded-md px-1 py-2 -mx-1 hover:bg-neutral-800/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            onClick={() =>
              setCollapsedLevels((prev) => {
                const next = new Set(prev);
                if (next.has(level)) next.delete(level);
                else next.add(level);
                return next;
              })
            }
            aria-expanded={!collapsed}
          >
            <h2 className="text-lg font-semibold">
              Level {level}
              <span className="ml-2 text-sm font-normal text-neutral-400 tabular-nums">
                {caster
                  ? `(${remainingHere} Pt${remainingHere === 1 ? "" : "s"} Left for Circle ${level}+)`
                  : `(${remainingHere} Pt${remainingHere === 1 ? "" : "s"} Left at This Level)`}
              </span>
            </h2>
            <span className="shrink-0 text-neutral-500 text-sm" aria-hidden>
              {collapsed ? "▶" : "▼"}
            </span>
          </button>
          {!collapsed ? (
          <div className="space-y-2 mt-2">
            {(grouped[level] ?? [])
              .filter((spell) => spell.source_type !== "archetype_grant")
              .filter((spell) => !isPickTwoOfThreeSpell(spell))
              .filter((spell) =>
                !pickOneGroups.some((g) => g.options.some((o) => o.catalog_rule_id === spell.catalog_rule_id))
              )
              .map((spell) => {
              const key = selectionKeyForCatalogSpell(spell);
              const purchased = selectionMap[key]?.purchased ?? 0;
              const evaluated = evaluateSpellRules(spell, selectedSpellNames, ruleContext);
              const incrementBlocked = evaluateSpellRules(spell, selectedSpellNames, {
                ...ruleContext,
                prospectiveAdditionalPurchases: 1,
              }).restricted;
              const expSuffix = experiencedSuffixByTargetKey.get(key);
              const display = computeDisplayRuleOverrides(
                spell,
                selectedSpellNames,
                purchased,
                className,
                expSuffix ? { experiencedChargeSuffix: expSuffix } : undefined
              );
              let longPressTimeout: ReturnType<typeof setTimeout> | null = null;
              return (
                <div
                  key={key}
                  className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded border p-2 sm:p-3 ${
                    evaluated.restricted ? "border-red-800 bg-red-950/20" : "border-neutral-800"
                  }`}
                  onMouseDown={() => {
                    longPressTimeout = startLongPress(spell);
                  }}
                  onMouseUp={() => {
                    if (longPressTimeout) clearTimeout(longPressTimeout);
                  }}
                  onMouseLeave={() => {
                    if (longPressTimeout) clearTimeout(longPressTimeout);
                  }}
                  onTouchStart={() => {
                    longPressTimeout = startLongPress(spell);
                  }}
                  onTouchEnd={() => {
                    if (longPressTimeout) clearTimeout(longPressTimeout);
                  }}
                >
                  <div>
                    <p className="font-medium">
                      {displaySpellTitle(spell, purchased, {
                        isExperiencedTarget: experiencedSuffixByTargetKey.has(key),
                        displayTag: display.tag,
                      })}
                    </p>
                    <p className="text-xs text-neutral-400">
                      {martial ? "" : `Cost ${evaluated.adjustedCost}`}
                      {showTypeSchool && spell.type ? ` - ${spell.type}` : ""}
                      {showTypeSchool && spell.school ? ` (${spell.school})` : ""}
                      {showRange && display.range ? ` (${display.range})` : ""}
                    </p>
                    {display.frequency ? <p className="text-xs text-neutral-500 mt-1">{display.frequency}</p> : null}
                    {evaluated.restricted && evaluated.reason ? (
                      <p className="text-xs text-red-300 mt-1">{evaluated.reason}</p>
                    ) : null}
                    {showIncantation && spell.incantation ? (
                      <p className="text-xs text-neutral-500 whitespace-pre-wrap mt-1">{spell.incantation}</p>
                    ) : null}
                    {showMaterials && spell.materials ? (
                      <p className="text-xs text-neutral-500 mt-1">({spell.materials})</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-center">
                    {martial ? null : (
                      <>
                        <button
                          onClick={() => decrement(spell)}
                          className="px-3 py-1.5 bg-neutral-700 rounded"
                        >
                          -
                        </button>
                        <span className="w-8 text-center">{purchased}</span>
                        <button
                          onClick={() => increment(spell, level)}
                          disabled={incrementBlocked}
                          className="px-3 py-1.5 bg-blue-600 rounded"
                        >
                          +
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            {pickOneGroupsForUI
              .filter((g) => g.level === level && !isLookThePartPickOneGroup(g))
              .map((group, idx) => {
                const chosen = group.options.find((opt) =>
                  opt.catalog_rule_id != null && selectionMap[catalogRuleKey(opt.catalog_rule_id)]?.purchased > 0
                );
                const chosenId = chosen?.catalog_rule_id ?? "";
                return (
                  <div key={group.groupKey} className="rounded border border-neutral-800 p-3 ml-3 sm:ml-6">
                    <p className="text-sm text-neutral-300">
                      {group.optionalMartialArchetype
                        ? "Optional (Martial Archetype): Pick One of the Following Abilities for This Level:"
                        : "Pick One of the Following Abilities for This Level:"}
                    </p>
                    <p className="text-xs text-neutral-500 mb-2">
                      {group.requiredForMartial ? "Required for Martial Builds." : "Optional Choice."}
                    </p>
                    <select
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-sm"
                      value={chosenId}
                      onChange={(e) => choosePickOne(group.groupKey, Number(e.target.value))}
                    >
                      <option value="">
                        {group.optionalMartialArchetype ? "No Archetype" : "Select One"}
                      </option>
                      {group.options.map((opt) => (
                        <option key={opt.catalog_rule_id ?? `${opt.id}-${idx}`} value={opt.catalog_rule_id ?? ""}>
                          {opt.name}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            {pickTwoOfThreeGroupsForUI
              .filter((g) => g.level === level)
              .map((group) => {
                const selectedCount = group.options.filter(
                  (opt) =>
                    opt.catalog_rule_id != null &&
                    selectionMap[catalogRuleKey(opt.catalog_rule_id)]?.purchased > 0
                ).length;
                return (
                  <div key={group.groupKey} className="rounded border border-neutral-800 p-3 ml-3 sm:ml-6">
                    <p className="text-sm text-neutral-300">Pick two of three abilities for this level:</p>
                    <p className="text-xs text-neutral-500 mb-2">
                      {group.requiredForMartial
                        ? "Select exactly two. Required for martial builds."
                        : "Select exactly two (optional group)."}
                    </p>
                    <ul className="space-y-2">
                      {group.options.map((opt) => {
                        const rid = opt.catalog_rule_id;
                        if (rid == null) return null;
                        const key = catalogRuleKey(rid);
                        const on = (selectionMap[key]?.purchased ?? 0) > 0;
                        return (
                          <li key={key} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`p23-${level}-${rid}`}
                              checked={on}
                              disabled={!on && selectedCount >= 2}
                              onChange={(e) =>
                                togglePickTwoOfThree(group.options, rid, e.target.checked)
                              }
                              className="rounded border-neutral-600"
                            />
                            <label htmlFor={`p23-${level}-${rid}`} className="text-sm text-neutral-200 cursor-pointer">
                              {opt.name}
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
          </div>
          ) : null}
        </section>
        );
      })}

      {visibleArchetypeGrants.length > 0 ? (
        <section className="border border-neutral-800 rounded-lg p-3 sm:p-4">
          <h2 className="text-lg font-semibold mb-2">Archetype abilities</h2>
          <p className="text-xs text-neutral-500 mb-3">
            Granted by your archetype selection. Shown for reference; not saved as extra spell rows.
          </p>
          <div className="space-y-2">
            {visibleArchetypeGrants.map((row) => {
              const spell = findSpellForSelection(spells, row);
              const purchased = row.purchased;
              const rowKey = selectionKeyFromRow(row);
              const expSuffix = experiencedSuffixByTargetKey.get(rowKey);
              const evaluated = spell ? evaluateSpellRules(spell, selectedSpellNames, ruleContext) : null;
              const display = spell
                ? computeDisplayRuleOverrides(
                    spell,
                    selectedSpellNames,
                    purchased,
                    className,
                    expSuffix ? { experiencedChargeSuffix: expSuffix } : undefined
                  )
                : { frequency: null, range: null, tag: null };
              let longPressTimeout: ReturnType<typeof setTimeout> | null = null;
              return (
                <div
                  key={row.id}
                  className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded border p-2 sm:p-3 ${
                    evaluated?.restricted ? "border-red-800 bg-red-950/20" : "border-neutral-800"
                  }`}
                  onMouseDown={() => {
                    if (spell) longPressTimeout = startLongPress(spell, display);
                  }}
                  onMouseUp={() => {
                    if (longPressTimeout) clearTimeout(longPressTimeout);
                  }}
                  onMouseLeave={() => {
                    if (longPressTimeout) clearTimeout(longPressTimeout);
                  }}
                  onTouchStart={() => {
                    if (spell) longPressTimeout = startLongPress(spell, display);
                  }}
                  onTouchEnd={() => {
                    if (longPressTimeout) clearTimeout(longPressTimeout);
                  }}
                >
                  <div>
                    <p className="font-medium">
                      {spell
                        ? displaySpellTitle(spell, purchased, {
                            isExperiencedTarget: experiencedSuffixByTargetKey.has(rowKey),
                            displayTag: display.tag,
                          })
                        : `Spell #${row.spell_id}`}
                    </p>
                    {spell ? (
                      <p className="text-xs text-neutral-400">
                        {showTypeSchool && spell.type ? `${spell.type}` : ""}
                        {showTypeSchool && spell.school ? ` (${spell.school})` : ""}
                        {showRange && display.range ? ` (${display.range})` : ""}
                      </p>
                    ) : null}
                    {display.frequency ? (
                      <p className="text-xs text-neutral-500 mt-1">{display.frequency}</p>
                    ) : null}
                    {evaluated?.restricted && evaluated.reason ? (
                      <p className="text-xs text-red-300 mt-1">{evaluated.reason}</p>
                    ) : null}
                    {showIncantation && spell?.incantation ? (
                      <p className="text-xs text-neutral-500 whitespace-pre-wrap mt-1">{spell.incantation}</p>
                    ) : null}
                    {showMaterials && spell?.materials ? (
                      <p className="text-xs text-neutral-500 mt-1">({spell.materials})</p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={saveSelections}
          disabled={
            saving ||
            !experiencedStateValid.ok ||
            pickOneGroupsForUI.some(
              (g) =>
                !isRequiredPickOneGroupSatisfied(
                  g,
                  (catalogRuleId) =>
                    (selectionMap[catalogRuleKey(catalogRuleId)]?.purchased ?? 0) > 0,
                  spells,
                  selectedSpellNames,
                  ruleContext
                )
            ) ||
            pickTwoOfThreeGroupsForUI.some((g) => {
              if (!g.requiredForMartial) return false;
              const n = g.options.filter(
                (opt) =>
                  opt.catalog_rule_id != null &&
                  selectionMap[catalogRuleKey(opt.catalog_rule_id)]?.purchased > 0
              ).length;
              return n < 2;
            })
          }
          className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
        >
          {saving ? "Saving…" : "Save Build Spells"}
        </button>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        {!experiencedStateValid.ok ? (
          <p className="text-sm text-amber-300 max-w-prose">{experiencedStateValid.message}</p>
        ) : null}
      </div>
    </div>
  );
}
