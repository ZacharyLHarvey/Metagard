import "server-only";
import { formatSpellFrequency } from "@/lib/spellbook/formatFrequency";
import { createClient } from "@/lib/server/supabaseServer";
import type {
  CustomBuildRow,
  CustomBuildSpellSelectionInput,
  CustomBuildSpellSelectionRow,
  CustomClassRow,
  CustomClassSpellRuleRow,
  CustomClassType,
  CustomClassWizardPayload,
  SpellRefKind,
} from "@/lib/customClass/types";
import { validateCustomClassPayload } from "@/lib/customClass/validation";
import { getGlobalAverageRating, getNumericEntityVoteStats } from "@/lib/queries/ratingStats";
import type { BuildSpellSelectionInput, BuildSpellSelectionRow, SpellRow } from "@/lib/spellbook/types";
import { buildMartialAutoSelections } from "@/lib/spellbook/martial";
import { validateExperiencedState } from "@/lib/spellbook/experienced";
import { findSpellForSelection } from "@/lib/spellbook/selection";
import { computeTierResult, type TierLabel } from "@/lib/tier";

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toStringOrNull(value: unknown): string | null {
  if (typeof value === "string") return value;
  return null;
}

async function getCurrentUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

function normalizeCanonicalSpell(row: Record<string, unknown>): SpellRow | null {
  const id = toNumberOrNull(row.id);
  const name = toStringOrNull(row.name);
  if (id === null || !name) return null;
  return {
    id,
    name,
    level: toNumberOrNull(row.level) ?? toNumberOrNull(row.spell_level),
    school: toStringOrNull(row.school),
    type: toStringOrNull(row.type),
    range: toStringOrNull(row.range),
    materials: toStringOrNull(row.materials),
    incantation: toStringOrNull(row.incantation),
    effect: toStringOrNull(row.effect),
    limitation: toStringOrNull(row.limitation),
    note: toStringOrNull(row.note),
    cost: toNumberOrNull(row.cost),
    max: toNumberOrNull(row.max) ?? toNumberOrNull(row.max_count),
    frequency: formatSpellFrequency(row.frequency) ?? toStringOrNull(row.frequency),
    spell_kind: "canonical",
  };
}

function normalizeCustomSpell(row: Record<string, unknown>): SpellRow | null {
  const id = toNumberOrNull(row.id);
  const name = toStringOrNull(row.name);
  if (id === null || !name) return null;
  return {
    id,
    name,
    level: null,
    school: toStringOrNull(row.school),
    type: toStringOrNull(row.spell_type),
    range: toStringOrNull(row.range),
    materials: toStringOrNull(row.materials),
    incantation: toStringOrNull(row.incantation),
    effect: toStringOrNull(row.effect),
    limitation: toStringOrNull(row.limitations),
    note: toStringOrNull(row.notes),
    cost: null,
    max: null,
    frequency: null,
    spell_kind: "custom",
    custom_spell_id: id,
  };
}

function mergeCustomRuleWithSpell(ruleRow: Record<string, unknown>, base: SpellRow): SpellRow {
  const frequencyRaw = ruleRow.frequency;
  const frequency =
    frequencyRaw == null ? null : formatSpellFrequency(frequencyRaw) ?? null;
  const ruleId = toNumberOrNull(ruleRow.id);
  return {
    ...base,
    level: toNumberOrNull(ruleRow.spell_level) ?? base.level,
    cost: toNumberOrNull(ruleRow.cost) ?? base.cost,
    max: toNumberOrNull(ruleRow.max_count) ?? base.max,
    frequency: frequency ?? base.frequency,
    catalog_rule_id: ruleId,
    source_type: toStringOrNull(ruleRow.source_type),
    option_group: toStringOrNull(ruleRow.option_group),
    is_look_the_part:
      typeof ruleRow.is_look_the_part === "boolean" ? ruleRow.is_look_the_part : null,
  };
}

export function classTypeFromCustomClass(row: Pick<CustomClassRow, "class_type">): CustomClassType {
  return row.class_type === "caster" ? "caster" : "martial";
}

export function isCustomClassMartial(classType: CustomClassType): boolean {
  return classType === "martial";
}

export function isCustomClassCaster(classType: CustomClassType): boolean {
  return classType === "caster";
}

export async function getCustomClassById(id: number): Promise<CustomClassRow | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("custom_classes").select("*").eq("id", id).maybeSingle();
  if (!data) return null;
  return data as CustomClassRow;
}

export async function listCustomClassesForBuildPicker(): Promise<CustomClassRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("custom_classes")
    .select("*")
    .order("name");
  return (data ?? []) as CustomClassRow[];
}

export type CustomClassLeaderboardRow = {
  id: number;
  name: string;
  owner_id: string | null;
  average_rating: number;
  weighted_rating: number;
  tier: TierLabel;
  tier_rank: number;
  ratings_count: number;
};

export async function getCustomClassLeaderboard(): Promise<CustomClassLeaderboardRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("custom_classes").select("id, name, owner_id, average_rating");
  if (error) throw error;

  const rows = (data ?? []) as Array<{
    id: number;
    name: string;
    owner_id: string | null;
    average_rating: number | null;
  }>;

  if (rows.length === 0) return [];

  const globalAverage = await getGlobalAverageRating("custom_class_ratings");
  const voteStats = await getNumericEntityVoteStats(
    "custom_class_ratings",
    "custom_class_id",
    rows.map((r) => r.id)
  );

  return rows
    .map((r) => {
      const stat = voteStats.get(r.id) ?? { votes: 0, rawAverage: Number(r.average_rating ?? 0) };
      const tierData = computeTierResult(stat.rawAverage, stat.votes, globalAverage);
      return {
        id: r.id,
        name: r.name,
        owner_id: typeof r.owner_id === "string" ? r.owner_id : null,
        average_rating: stat.rawAverage,
        weighted_rating: tierData.weightedRating,
        tier: tierData.tier,
        tier_rank: tierData.tierRank,
        ratings_count: stat.votes,
      };
    })
    .sort(
      (a, b) =>
        a.tier_rank - b.tier_rank ||
        b.weighted_rating - a.weighted_rating ||
        b.ratings_count - a.ratings_count ||
        a.name.localeCompare(b.name)
    );
}

function nestedCustomClassRecord(nested: unknown): Record<string, unknown> | null {
  return nested && typeof nested === "object" && !Array.isArray(nested)
    ? (nested as Record<string, unknown>)
    : null;
}

function classNameFromNestedCustomClasses(nested: unknown): string {
  const cc = nestedCustomClassRecord(nested);
  return cc?.name != null ? String(cc.name) : "Custom class";
}

export type HomeCustomBuildRow = {
  id: number;
  name: string;
  level: number;
  class_name: string;
  owner_id: string | null;
};

export function toHomeCustomBuildRow(raw: Record<string, unknown>): HomeCustomBuildRow {
  return {
    id: Number(raw.id),
    name: String(raw.name),
    level: Number(raw.level),
    class_name: classNameFromNestedCustomClasses(raw.custom_classes),
    owner_id: typeof raw.owner_id === "string" ? raw.owner_id : null,
  };
}

export async function getMyCustomBuilds(): Promise<HomeCustomBuildRow[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("custom_builds")
    .select("id,name,level,owner_id,custom_classes(name)")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((raw) => toHomeCustomBuildRow(raw as Record<string, unknown>));
}

export type PublicCustomBuildListRow = {
  id: number;
  name: string;
  level: number;
  look_the_part: boolean;
  average_rating: number | null;
  owner_id: string | null;
  created_at: string;
  class_name: string;
  class_type: CustomClassType;
};

export async function listPublicCustomBuilds(): Promise<PublicCustomBuildListRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("custom_builds")
    .select("id,name,level,look_the_part,average_rating,owner_id,created_at,custom_classes(name,class_type)")
    .order("created_at", { ascending: false });

  if (error) throw error;

  const rows: PublicCustomBuildListRow[] = [];
  for (const raw of data ?? []) {
    const r = raw as Record<string, unknown>;
    const cc = nestedCustomClassRecord(r.custom_classes);
    const className = classNameFromNestedCustomClasses(r.custom_classes);
    const classType: CustomClassType = cc?.class_type === "caster" ? "caster" : "martial";
    rows.push({
      id: Number(r.id),
      name: String(r.name),
      level: Number(r.level),
      look_the_part: Boolean(r.look_the_part),
      average_rating:
        typeof r.average_rating === "number" ? r.average_rating : Number(r.average_rating ?? 0),
      owner_id: typeof r.owner_id === "string" ? r.owner_id : null,
      created_at: String(r.created_at ?? ""),
      class_name: className,
      class_type: classType,
    });
  }

  rows.sort((a, b) => {
    const classCmp = a.class_name.localeCompare(b.class_name);
    if (classCmp !== 0) return classCmp;
    if (a.level !== b.level) return a.level - b.level;
    return a.name.localeCompare(b.name);
  });

  return rows;
}

export async function getCustomClassRules(customClassId: number): Promise<CustomClassSpellRuleRow[]> {
  const supabase = await createClient();
  const { data: rules } = await supabase
    .from("custom_class_spell_rules")
    .select("*")
    .eq("custom_class_id", customClassId)
    .order("spell_level")
    .order("id");

  if (!rules?.length) return [];

  const canonicalIds = rules
    .map((r) => toNumberOrNull((r as Record<string, unknown>).spell_id))
    .filter((id): id is number => id != null);
  const customIds = rules
    .map((r) => toNumberOrNull((r as Record<string, unknown>).custom_spell_id))
    .filter((id): id is number => id != null);

  const [canonicalSpells, customSpells] = await Promise.all([
    canonicalIds.length
      ? supabase.from("spells").select("*").in("id", canonicalIds)
      : Promise.resolve({ data: [] }),
    customIds.length
      ? supabase.from("custom_spells").select("*").in("id", customIds)
      : Promise.resolve({ data: [] }),
  ]);

  const canonicalById = new Map(
    (canonicalSpells.data ?? []).map((s) => [Number((s as Record<string, unknown>).id), s])
  );
  const customById = new Map(
    (customSpells.data ?? []).map((s) => [Number((s as Record<string, unknown>).id), s])
  );

  return rules.map((row) => {
    const r = row as Record<string, unknown>;
    const spellId = toNumberOrNull(r.spell_id);
    const customSpellId = toNumberOrNull(r.custom_spell_id);
    const kind: SpellRefKind = customSpellId != null ? "custom" : "canonical";
    const refId = (customSpellId ?? spellId) as number;
    const spellRow =
      kind === "custom"
        ? (customById.get(refId) as Record<string, unknown> | undefined)
        : (canonicalById.get(refId) as Record<string, unknown> | undefined);
    return {
      id: toNumberOrNull(r.id) ?? undefined,
      custom_class_id: toNumberOrNull(r.custom_class_id) ?? undefined,
      spell_kind: kind,
      spell_id: refId,
      spell_name: toStringOrNull(spellRow?.name) ?? undefined,
      spell_level: toNumberOrNull(r.spell_level) ?? 1,
      cost: toNumberOrNull(r.cost) ?? 0,
      max_count: toNumberOrNull(r.max_count),
      frequency: (r.frequency as CustomClassSpellRuleRow["frequency"]) ?? null,
      restricted: Boolean(r.restricted),
      source_type: toStringOrNull(r.source_type) ?? "base",
      option_group: toStringOrNull(r.option_group),
      is_look_the_part: Boolean(r.is_look_the_part),
    };
  });
}

export async function getCatalogSpellsForCustomClass(
  customClassId: number,
  maxLevel: number
): Promise<SpellRow[]> {
  const supabase = await createClient();
  const { data: rules } = await supabase
    .from("custom_class_spell_rules")
    .select("*")
    .eq("custom_class_id", customClassId)
    .lte("spell_level", maxLevel)
    .order("spell_level")
    .order("id");

  if (!rules?.length) return [];

  const merged: SpellRow[] = [];
  for (const rule of rules as Array<Record<string, unknown>>) {
    const spellId = toNumberOrNull(rule.spell_id);
    const customSpellId = toNumberOrNull(rule.custom_spell_id);
    let base: SpellRow | null = null;
    if (spellId != null) {
      const { data } = await supabase.from("spells").select("*").eq("id", spellId).maybeSingle();
      if (data) base = normalizeCanonicalSpell(data as Record<string, unknown>);
    } else if (customSpellId != null) {
      const { data } = await supabase.from("custom_spells").select("*").eq("id", customSpellId).maybeSingle();
      if (data) base = normalizeCustomSpell(data as Record<string, unknown>);
    }
    if (!base) continue;
    merged.push(mergeCustomRuleWithSpell(rule, base));
  }

  return merged.sort((a, b) => {
    const levelA = a.level ?? 0;
    const levelB = b.level ?? 0;
    if (levelA !== levelB) return levelA - levelB;
    return a.name.localeCompare(b.name);
  });
}

function ruleToDbInsert(rule: CustomClassSpellRuleRow, customClassId: number) {
  return {
    custom_class_id: customClassId,
    spell_id: rule.spell_kind === "canonical" ? rule.spell_id : null,
    custom_spell_id: rule.spell_kind === "custom" ? rule.spell_id : null,
    spell_level: rule.spell_level,
    cost: rule.cost,
    max_count: rule.max_count,
    frequency: rule.frequency,
    restricted: rule.restricted,
    source_type: rule.source_type,
    option_group: rule.option_group,
    is_look_the_part: rule.is_look_the_part,
  };
}

export async function createCustomClassWithRules(
  ownerId: string,
  payload: CustomClassWizardPayload
): Promise<number> {
  const validation = validateCustomClassPayload(payload);
  if (!validation.ok) throw new Error(validation.message);

  const supabase = await createClient();
  const { data: created, error } = await supabase
    .from("custom_classes")
    .insert({
      owner_id: ownerId,
      name: payload.name.trim(),
      description: payload.description,
      class_type: payload.class_type,
      armor: payload.armor,
      shields: payload.shields,
      weapons: payload.weapons,
    })
    .select("id")
    .single();
  if (error) throw error;

  const classId = created.id as number;
  if (payload.rules.length > 0) {
    const { error: rulesErr } = await supabase
      .from("custom_class_spell_rules")
      .insert(payload.rules.map((r) => ruleToDbInsert(r, classId)));
    if (rulesErr) throw rulesErr;
  }
  return classId;
}

export async function updateCustomClassWithRules(
  ownerId: string,
  classId: number,
  payload: CustomClassWizardPayload
): Promise<void> {
  const validation = validateCustomClassPayload(payload);
  if (!validation.ok) throw new Error(validation.message);

  const supabase = await createClient();
  const { error } = await supabase
    .from("custom_classes")
    .update({
      name: payload.name.trim(),
      description: payload.description,
      class_type: payload.class_type,
      armor: payload.armor,
      shields: payload.shields,
      weapons: payload.weapons,
    })
    .eq("id", classId)
    .eq("owner_id", ownerId);
  if (error) throw error;

  await supabase.from("custom_class_spell_rules").delete().eq("custom_class_id", classId);
  if (payload.rules.length > 0) {
    const { error: rulesErr } = await supabase
      .from("custom_class_spell_rules")
      .insert(payload.rules.map((r) => ruleToDbInsert(r, classId)));
    if (rulesErr) throw rulesErr;
  }
}

export async function createCustomBuild(input: {
  name: string;
  customClassId: number;
  level: number;
  lookThePart: boolean;
  playStyle?: string | null;
  priority?: string | null;
  synergy?: string | null;
  enemies?: string | null;
  recommendedGear?: string | null;
}) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Unauthorized");

  const customClass = await getCustomClassById(input.customClassId);
  if (!customClass) throw new Error("Custom class not found");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("custom_builds")
    .insert({
      name: input.name,
      custom_class_id: input.customClassId,
      level: input.level,
      look_the_part: input.lookThePart,
      play_style: input.playStyle ?? null,
      build_priority: input.priority ?? null,
      synergy: input.synergy ?? null,
      enemies: input.enemies ?? null,
      recommended_gear: input.recommendedGear ?? null,
      owner_id: userId,
      average_rating: 0,
      ruleset_version: "V8.7",
    })
    .select("id")
    .single();
  if (error) throw error;

  const buildId = data.id as number;
  if (isCustomClassMartial(customClass.class_type)) {
    const spells = await getCatalogSpellsForCustomClass(input.customClassId, input.level);
    const selections = buildMartialAutoSelections(
      spells,
      input.lookThePart,
      customClass.name,
      []
    ).map((s) => selectionInputToCustomRow(s, buildId));
    if (selections.length > 0) {
      const { error: selErr } = await supabase.from("custom_build_spell_selections").insert(
        selections.map((s) => ({
          ...s,
          metadata: s.metadata ?? {},
        }))
      );
      if (selErr) throw selErr;
    }
  }
  return buildId;
}

function selectionInputToCustomRow(
  s: BuildSpellSelectionInput,
  buildId: number
): Omit<CustomBuildSpellSelectionInput, "metadata"> & { metadata: Record<string, unknown> } {
  const spell = s as BuildSpellSelectionInput & { custom_spell_id?: number | null; spell_kind?: SpellRefKind };
  const isCustom = spell.custom_spell_id != null || spell.spell_kind === "custom";
  return {
    custom_build_id: buildId,
    spell_id: isCustom ? null : s.spell_id,
    custom_spell_id: isCustom ? (spell.custom_spell_id ?? s.spell_id) : null,
    spell_level: s.spell_level,
    purchased: s.purchased,
    experienced: s.experienced,
    selection_group: s.selection_group,
    chosen: s.chosen,
    metadata: s.metadata ?? {},
  };
}

export function parseCustomBuildSideboard(raw: unknown): Array<{ kind: SpellRefKind; id: number }> {
  if (!Array.isArray(raw)) return [];
  const out: Array<{ kind: SpellRefKind; id: number }> = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const kind = o.kind === "custom" ? "custom" : o.kind === "canonical" ? "canonical" : null;
    const id = typeof o.id === "number" ? o.id : Number(o.id);
    if (kind && Number.isFinite(id) && id > 0) out.push({ kind, id });
  }
  return out;
}

function normalizeCustomBuildRow(row: Record<string, unknown>): CustomBuildRow {
  const nested = row.custom_classes;
  return {
    ...(row as unknown as CustomBuildRow),
    save_count: Math.max(0, Number(row.save_count ?? 0)),
    clone_count: Math.max(0, Number(row.clone_count ?? 0)),
    sideboard: parseCustomBuildSideboard(row.sideboard),
    custom_class:
      nested && typeof nested === "object" && !Array.isArray(nested)
        ? (nested as CustomClassRow)
        : null,
  };
}

export async function getCustomBuildById(id: number): Promise<CustomBuildRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("custom_builds")
    .select("*, custom_classes(*)")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  return normalizeCustomBuildRow(data as Record<string, unknown>);
}

export async function getCustomBuildSpellSelections(
  buildId: number
): Promise<CustomBuildSpellSelectionRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("custom_build_spell_selections")
    .select("*")
    .eq("custom_build_id", buildId);
  return (data ?? []) as CustomBuildSpellSelectionRow[];
}

/** Convert DB selections to BuildSpellEditor-compatible rows. */
export function customSelectionsToBuildRows(
  rows: CustomBuildSpellSelectionRow[]
): BuildSpellSelectionInput[] {
  return rows.map((r) => ({
    build_id: r.custom_build_id,
    spell_id: r.spell_id ?? r.custom_spell_id ?? 0,
    spell_level: r.spell_level,
    purchased: r.purchased,
    experienced: r.experienced,
    selection_group: r.selection_group,
    chosen: r.chosen,
    metadata: r.metadata ?? {},
    custom_spell_id: r.custom_spell_id,
    spell_kind: r.custom_spell_id != null ? ("custom" as const) : ("canonical" as const),
  })) as BuildSpellSelectionInput[];
}

/** Convert DB selections to BuildSpellDetails / BuildSpellEditor rows with real ids. */
export function customSelectionsToBuildSelectionRows(
  rows: CustomBuildSpellSelectionRow[],
  buildId: number
): BuildSpellSelectionRow[] {
  return rows.map((r) => ({
    id: r.id,
    build_id: buildId,
    spell_id: r.spell_id ?? r.custom_spell_id ?? 0,
    spell_level: r.spell_level,
    purchased: r.purchased,
    experienced: r.experienced,
    selection_group: r.selection_group,
    chosen: r.chosen,
    metadata: r.metadata ?? {},
    ...(r.custom_spell_id != null
      ? { custom_spell_id: r.custom_spell_id, spell_kind: "custom" as const }
      : { spell_kind: "canonical" as const }),
  })) as BuildSpellSelectionRow[];
}

export async function upsertCustomBuildSpellSelections(
  buildId: number,
  selections: BuildSpellSelectionInput[]
) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Unauthorized");

  const supabase = await createClient();
  const { data: ownedBuild } = await supabase
    .from("custom_builds")
    .select("id,custom_class_id,level,look_the_part")
    .eq("id", buildId)
    .eq("owner_id", userId)
    .single();
  if (!ownedBuild) throw new Error("Forbidden");

  const customClass = await getCustomClassById(Number(ownedBuild.custom_class_id));
  if (!customClass) throw new Error("Custom class not found");

  let effectiveSelections = selections;
  if (isCustomClassMartial(customClass.class_type)) {
    const spells = await getCatalogSpellsForCustomClass(
      customClass.id,
      Number(ownedBuild.level ?? 1)
    );
    effectiveSelections = buildMartialAutoSelections(
      spells,
      Boolean(ownedBuild.look_the_part),
      customClass.name,
      selections
    ).map((s) => ({ ...s, build_id: buildId }));
  }

  await supabase.from("custom_build_spell_selections").delete().eq("custom_build_id", buildId);
  if (effectiveSelections.length === 0) return;

  const spellsForExperienced = await getCatalogSpellsForCustomClass(
    customClass.id,
    Number(ownedBuild.level ?? 1)
  );
  const rowsForValidate = effectiveSelections.map((s) => ({
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
  const ev = validateExperiencedState(rowsForValidate, spellsForExperienced);
  if (!ev.ok) throw new Error(ev.message);

  const payload = effectiveSelections.map((s) => selectionInputToCustomRow(s, buildId));
  const { error } = await supabase.from("custom_build_spell_selections").insert(payload);
  if (error) throw error;
}

export async function refreshCustomMartialBuildSelections(buildId: number) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Unauthorized");
  const supabase = await createClient();

  const { data: build } = await supabase
    .from("custom_builds")
    .select("id,custom_class_id,level,look_the_part,owner_id")
    .eq("id", buildId)
    .single();
  if (!build || build.owner_id !== userId) throw new Error("Forbidden");

  const customClass = await getCustomClassById(Number(build.custom_class_id));
  if (!customClass || !isCustomClassMartial(customClass.class_type)) return;

  const spells = await getCatalogSpellsForCustomClass(customClass.id, Number(build.level ?? 1));
  const { data: existingSelections } = await supabase
    .from("custom_build_spell_selections")
    .select("*")
    .eq("custom_build_id", buildId);
  const existing = customSelectionsToBuildRows(
    (existingSelections ?? []) as CustomBuildSpellSelectionRow[]
  );
  const selections = buildMartialAutoSelections(
    spells,
    Boolean(build.look_the_part),
    customClass.name,
    existing
  ).map((s) => selectionInputToCustomRow(s, buildId));

  await supabase.from("custom_build_spell_selections").delete().eq("custom_build_id", buildId);
  if (selections.length === 0) return;
  const { error } = await supabase.from("custom_build_spell_selections").insert(selections);
  if (error) throw error;
}

export async function searchCanonicalSpells(query: string, limit = 20) {
  const supabase = await createClient();
  const q = query.trim();
  if (!q) return [];

  const { data, error } = await supabase
    .from("spells")
    .select("id,name,type,school")
    .ilike("name", `%${q}%`)
    .order("name")
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => mapSpellSearchRow(row as Record<string, unknown>));
}

function mapSpellSearchRow(row: Record<string, unknown>) {
  const name =
    toStringOrNull(row.name) ??
    toStringOrNull(row.spell_name) ??
    toStringOrNull(row.title);
  return {
    kind: "canonical" as const,
    id: Number(row.id),
    name: name ?? `#${String(row.id)}`,
    type: toStringOrNull(row.type),
    level: null,
  };
}

export async function searchCustomSpells(query: string, limit = 20) {
  const supabase = await createClient();
  const q = query.trim();
  if (!q) return [];
  const { data, error } = await supabase
    .from("custom_spells")
    .select("id,name,spell_type,school")
    .ilike("name", `%${q}%`)
    .order("name")
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    kind: "custom" as const,
    id: Number((row as Record<string, unknown>).id),
    name: String((row as Record<string, unknown>).name),
    type: toStringOrNull((row as Record<string, unknown>).spell_type),
    level: null,
  }));
}

/** Resolve spell row for custom build selection (supports custom_spell_id). */
export function findSpellForCustomSelection(
  spells: SpellRow[],
  row: Pick<BuildSpellSelectionInput, "spell_id" | "spell_level" | "selection_group"> & {
    custom_spell_id?: number | null;
  }
): SpellRow | undefined {
  const extended = row as BuildSpellSelectionInput & { custom_spell_id?: number | null };
  if (extended.custom_spell_id != null) {
    const byCustom = spells.find(
      (s) => s.spell_kind === "custom" && s.custom_spell_id === extended.custom_spell_id
    );
    if (byCustom) return byCustom;
  }
  return findSpellForSelection(spells, row);
}
