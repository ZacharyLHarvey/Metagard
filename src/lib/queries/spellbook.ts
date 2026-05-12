import "server-only";
import { formatSpellFrequency } from "@/lib/spellbook/formatFrequency";
import { getGlobalAverageRating, getNumericEntityVoteStats, getStringEntityVoteStats } from "@/lib/queries/ratingStats";
import { createClient } from "@/lib/server/supabaseServer";
import { computeTierResult } from "@/lib/tier";
import type {
  BuildRow,
  BuildSpellSelectionInput,
  BuildSpellSelectionRow,
  ClassRow,
  SpellRow,
} from "@/lib/spellbook/types";
import { buildMartialAutoSelections, isMartialClass } from "@/lib/spellbook/martial";

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

/** Smart quotes mis-decoded as ΓÇ£ / ΓÇ¥ (common in legacy Swiftgard exports). */
function fixMojibakeCurlyQuotes(value: string | null): string | null {
  if (value == null) return null;
  return value.replace(/ΓÇ£/g, '"').replace(/ΓÇ¥/g, '"');
}

function normalizeSpellRow(row: Record<string, unknown>): SpellRow | null {
  const id = toNumberOrNull(row.id);
  const name =
    toStringOrNull(row.name) ??
    toStringOrNull(row.spell_name) ??
    toStringOrNull(row.title);
  if (id === null || !name) return null;

  return {
    id,
    name,
    level:
      toNumberOrNull(row.level) ??
      toNumberOrNull(row.spell_level) ??
      toNumberOrNull(row.min_level),
    school: toStringOrNull(row.school),
    type: toStringOrNull(row.type),
    range: toStringOrNull(row.range),
    materials: fixMojibakeCurlyQuotes(toStringOrNull(row.materials)),
    incantation: fixMojibakeCurlyQuotes(toStringOrNull(row.incantation)),
    effect: fixMojibakeCurlyQuotes(toStringOrNull(row.effect)),
    limitation: fixMojibakeCurlyQuotes(toStringOrNull(row.limitation)),
    note: fixMojibakeCurlyQuotes(toStringOrNull(row.note)),
    cost: toNumberOrNull(row.cost),
    max: toNumberOrNull(row.max) ?? toNumberOrNull(row.max_count),
    frequency: formatSpellFrequency(row.frequency) ?? toStringOrNull(row.frequency),
  };
}

async function getCurrentUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function getCatalogClasses() {
  const supabase = await createClient();
  // Try common schema shape first.
  const primary = await supabase.from("classes").select("id,name").order("name");
  if (!primary.error && (primary.data?.length ?? 0) > 0) {
    return (primary.data ?? []) as ClassRow[];
  }

  // Fallback: classes table exists but uses different column naming.
  const fallbackTable = await supabase.from("classes").select("*");
  if (!fallbackTable.error && (fallbackTable.data?.length ?? 0) > 0) {
    const normalized = (fallbackTable.data ?? [])
      .map((row: Record<string, unknown>, index: number) => {
        const rawName =
          (typeof row.name === "string" && row.name) ||
          (typeof row.class_name === "string" && row.class_name) ||
          (typeof row.class === "string" && row.class) ||
          (typeof row.title === "string" && row.title) ||
          null;
        if (!rawName) return null;
        return {
          id: Number(row.id ?? index + 1),
          name: rawName,
        };
      })
      .filter(Boolean) as ClassRow[];

    if (normalized.length > 0) {
      return normalized.sort((a, b) => a.name.localeCompare(b.name));
    }
  }

  // No spells-table class derivation: class names must match public.classes and
  // class_spell_rules.class_name (run `npm run db:swiftgard-sql` and apply generated SQL).
  return [];
}

export async function getClassById(id: number): Promise<ClassRow | null> {
  const classes = await getCatalogClasses();
  return classes.find((c) => c.id === id) ?? null;
}

export type ClassEquipment = {
  armor: string | null;
  shields: string | null;
  weapons: string | null;
};

export async function getClassEquipment(className: string): Promise<ClassEquipment | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("classes")
    .select("armor,shields,weapons")
    .eq("name", className)
    .maybeSingle();
  if (!data) return null;
  return {
    armor: toStringOrNull((data as Record<string, unknown>).armor),
    shields: toStringOrNull((data as Record<string, unknown>).shields),
    weapons: toStringOrNull((data as Record<string, unknown>).weapons),
  };
}

export type ClassLeaderboardRow = {
  id: number;
  name: string;
  average_rating: number;
  weighted_rating: number;
  tier: string;
  tier_rank: number;
  ratings_count: number;
};

export async function getClassLeaderboard(): Promise<ClassLeaderboardRow[]> {
  const classes = await getCatalogClasses();
  if (classes.length === 0) return [];
  const names = classes.map((c) => c.name);
  const globalAverage = await getGlobalAverageRating("class_ratings");
  const statsByName = await getStringEntityVoteStats("class_ratings", "class_name", names);

  return classes
    .map((c) => {
      const stat = statsByName.get(c.name);
      const average = stat?.rawAverage ?? 0;
      const votes = stat?.votes ?? 0;
      const tierData = computeTierResult(average, votes, globalAverage);
      return {
        id: c.id,
        name: c.name,
        average_rating: average,
        weighted_rating: tierData.weightedRating,
        tier: tierData.tier,
        tier_rank: tierData.tierRank,
        ratings_count: votes,
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

function mergeRuleWithSpell(ruleRow: Record<string, unknown>, base: SpellRow): SpellRow {
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

/**
 * Spells shown on the edit-build page must come only from:
 * `class_spell_rules` (class, level, cost, max, frequency) joined to `spells` (canonical spell row).
 * We do not fall back to scanning `spells` by a loose class column — that produced wrong lists
 * (e.g. every spell with no `class` matched every build).
 */
export async function getCatalogSpellsForClass(className: string, maxLevel: number) {
  const supabase = await createClient();

  // Single round-trip when FK spell_id -> spells.id exists (recommended).
  const embedded = await supabase
    .from("class_spell_rules")
    .select(
      "id, spell_id, spell_level, cost, max_count, frequency, restricted, source_type, option_group, is_look_the_part, spells (*)"
    )
    .eq("class_name", className)
    .lte("spell_level", maxLevel)
    .order("spell_level")
    .order("spell_id");

  if (!embedded.error && embedded.data && embedded.data.length > 0) {
    const merged: SpellRow[] = [];
    for (const row of embedded.data as Array<Record<string, unknown>>) {
      const nested = row.spells;
      if (!nested || typeof nested !== "object" || Array.isArray(nested)) continue;
      const base = normalizeSpellRow(nested as Record<string, unknown>);
      if (!base) continue;
      merged.push(mergeRuleWithSpell(row, base));
    }
    if (merged.length > 0) {
      return merged.sort((a, b) => {
        const levelA = a.level ?? 0;
        const levelB = b.level ?? 0;
        if (levelA !== levelB) return levelA - levelB;
        return a.name.localeCompare(b.name);
      });
    }
  }

  // Two-query path: same data, no loose spells scan.
  const rules = await supabase
    .from("class_spell_rules")
    .select(
      "id, spell_id, spell_level, cost, max_count, frequency, restricted, source_type, option_group, is_look_the_part"
    )
    .eq("class_name", className)
    .lte("spell_level", maxLevel)
    .order("spell_level")
    .order("spell_id");

  if (rules.error || !rules.data?.length) return [];

  const ruleRows = rules.data as Array<Record<string, unknown>>;
  const ids = Array.from(
    new Set(
      ruleRows.map((r) => toNumberOrNull(r.spell_id)).filter((id): id is number => id !== null)
    )
  );
  if (ids.length === 0) return [];

  const spellRows = await supabase.from("spells").select("*").in("id", ids);
  if (spellRows.error || !spellRows.data?.length) return [];

  const spellMap = new Map<number, SpellRow>();
  for (const row of spellRows.data as Array<Record<string, unknown>>) {
    const normalized = normalizeSpellRow(row);
    if (normalized) spellMap.set(normalized.id, normalized);
  }

  const merged: SpellRow[] = [];
  for (const ruleRow of ruleRows) {
    const spellId = toNumberOrNull(ruleRow.spell_id);
    if (spellId === null) continue;
    const base = spellMap.get(spellId);
    if (!base) continue;
    merged.push(mergeRuleWithSpell(ruleRow, base));
  }

  return merged.sort((a, b) => {
    const levelA = a.level ?? 0;
    const levelB = b.level ?? 0;
    if (levelA !== levelB) return levelA - levelB;
    return a.name.localeCompare(b.name);
  });
}

export async function getMyBuilds() {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("builds")
    .select("*")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });
  return (data ?? []) as BuildRow[];
}

export async function getSavedBuilds() {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("saved_builds")
    .select("build_id, builds(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const mapped = (data ?? [])
    .map((row) => row.builds)
    .filter(Boolean) as unknown as BuildRow[];
  return mapped;
}

/** Same `saved_builds` source as `getSavedBuilds` / `toggleSavedBuild`. */
export async function isBuildSavedByCurrentUser(buildId: number): Promise<boolean> {
  const userId = await getCurrentUserId();
  if (!userId) return false;
  const supabase = await createClient();
  const { data } = await supabase
    .from("saved_builds")
    .select("build_id")
    .eq("user_id", userId)
    .eq("build_id", buildId)
    .maybeSingle();
  return data != null;
}

/** Builds created by a user (public list; RLS must allow reading builds rows). */
export async function getBuildsOwnedByUser(ownerId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("builds")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });
  return (data ?? []) as BuildRow[];
}

/** Saved builds for a profile user (public when RLS allows reading saved_builds). */
export async function getSavedBuildsForUser(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("saved_builds")
    .select("build_id, builds(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  const mapped = (data ?? [])
    .map((row) => row.builds)
    .filter(Boolean) as unknown as BuildRow[];
  return mapped;
}

export async function getPublicBuilds() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("builds")
    .select("*")
    .order("id", { ascending: true });
  return (data ?? []) as BuildRow[];
}

export async function getBuildById(id: number) {
  const supabase = await createClient();
  const { data } = await supabase.from("builds").select("*").eq("id", id).single();
  return (data as BuildRow | null) ?? null;
}

export async function getBuildSpellSelections(buildId: number) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("build_spell_selections")
    .select("*")
    .eq("build_id", buildId)
    .order("spell_level")
    .order("spell_id");
  return (data ?? []) as BuildSpellSelectionRow[];
}

export async function createBuild(input: {
  name: string;
  className: string;
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

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("builds")
    .insert({
      name: input.name,
      class: input.className,
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
  if (isMartialClass(input.className)) {
    const spells = await getCatalogSpellsForClass(input.className, input.level);
    const selections = buildMartialAutoSelections(spells, input.lookThePart, input.className).map((s) => ({
      ...s,
      build_id: buildId,
    }));
    if (selections.length > 0) {
      const { error: selErr } = await supabase.from("build_spell_selections").insert(
        selections.map((s) => ({ ...s, metadata: {} }))
      );
      if (selErr) throw selErr;
    }
  }
  return buildId;
}

export async function upsertBuildSpellSelections(buildId: number, selections: BuildSpellSelectionInput[]) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Unauthorized");

  const supabase = await createClient();

  const { data: ownedBuild } = await supabase
    .from("builds")
    .select("id,class,level,look_the_part")
    .eq("id", buildId)
    .eq("owner_id", userId)
    .single();

  if (!ownedBuild) {
    throw new Error("Forbidden");
  }

  await supabase.from("build_spell_selections").delete().eq("build_id", buildId);

  let effectiveSelections = selections;
  if (ownedBuild && isMartialClass(String((ownedBuild as { class?: unknown }).class ?? ""))) {
    const spells = await getCatalogSpellsForClass(
      String((ownedBuild as { class?: unknown }).class ?? ""),
      Number((ownedBuild as { level?: unknown }).level ?? 1)
    );
    effectiveSelections = buildMartialAutoSelections(
      spells,
      Boolean((ownedBuild as { look_the_part?: unknown }).look_the_part),
      String((ownedBuild as { class?: unknown }).class ?? ""),
      selections
    ).map((s) => ({ ...s, build_id: buildId }));
  }

  if (effectiveSelections.length === 0) return;

  const payload = effectiveSelections.map((s) => ({
    build_id: buildId,
    spell_id: s.spell_id,
    spell_level: s.spell_level,
    purchased: s.purchased,
    experienced: s.experienced,
    selection_group: s.selection_group,
    chosen: s.chosen,
    metadata: s.metadata ?? {},
  }));

  const { error } = await supabase.from("build_spell_selections").insert(payload);
  if (error) throw error;
}

export async function refreshMartialBuildSelections(buildId: number) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Unauthorized");
  const supabase = await createClient();

  const { data: build } = await supabase
    .from("builds")
    .select("id,class,level,look_the_part,owner_id")
    .eq("id", buildId)
    .single();
  if (!build || build.owner_id !== userId) throw new Error("Forbidden");
  if (!isMartialClass(String(build.class ?? ""))) return;

  const spells = await getCatalogSpellsForClass(String(build.class ?? ""), Number(build.level ?? 1));
  const { data: existingSelections } = await supabase
    .from("build_spell_selections")
    .select("spell_id,spell_level,purchased,experienced,selection_group,chosen")
    .eq("build_id", buildId);
  const selections = buildMartialAutoSelections(
    spells,
    Boolean(build.look_the_part),
    String(build.class ?? ""),
    (existingSelections ?? []) as BuildSpellSelectionInput[]
  ).map((s) => ({
    ...s,
    build_id: buildId,
    metadata: {},
  }));
  await supabase.from("build_spell_selections").delete().eq("build_id", buildId);
  if (selections.length === 0) return;
  const { error } = await supabase.from("build_spell_selections").insert(selections);
  if (error) throw error;
}

export async function toggleSavedBuild(buildId: number) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Unauthorized");

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("saved_builds")
    .select("build_id")
    .eq("user_id", userId)
    .eq("build_id", buildId)
    .maybeSingle();

  if (existing) {
    await supabase.from("saved_builds").delete().eq("user_id", userId).eq("build_id", buildId);
    return { saved: false };
  }

  await supabase.from("saved_builds").insert({ user_id: userId, build_id: buildId });
  return { saved: true };
}

export async function getPatchNotes() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("patch_notes")
    .select("id,version,title,details,created_at")
    .order("created_at", { ascending: false });

  if (error) return [];
  return data ?? [];
}

export type SpellListRow = {
  id: number;
  name: string;
  level: number | null;
  school: string | null;
  type: string | null;
  average_rating: number | null;
  weighted_rating?: number | null;
  ratings_count?: number | null;
  tier?: string | null;
  tier_rank?: number | null;
};

export async function getSpellById(id: number) {
  const supabase = await createClient();
  const { data } = await supabase.from("spells").select("*").eq("id", id).maybeSingle();
  if (!data) return null;
  const row = { ...(data as Record<string, unknown>) };
  for (const key of ["effect", "materials", "incantation", "limitation", "note"] as const) {
    const v = row[key];
    if (typeof v === "string") row[key] = fixMojibakeCurlyQuotes(v) ?? v;
  }
  return row;
}

export async function getAllSpellsList(): Promise<SpellListRow[]> {
  const supabase = await createClient();
  const primary = await supabase
    .from("spells")
    .select("id,name,level,school,type,average_rating")
    .order("name");
  if (!primary.error && (primary.data?.length ?? 0) > 0) {
    const rows = (primary.data ?? []) as SpellListRow[];
    const ids = rows.map((r) => r.id);
    const [globalAverage, voteStats] = await Promise.all([
      getGlobalAverageRating("spell_ratings"),
      getNumericEntityVoteStats("spell_ratings", "spell_id", ids),
    ]);
    return rows.map((r) => {
      const stat = voteStats.get(r.id) ?? { votes: 0, rawAverage: Number(r.average_rating ?? 0) };
      const tierData = computeTierResult(stat.rawAverage, stat.votes, globalAverage);
      return {
        ...r,
        average_rating: stat.rawAverage,
        weighted_rating: tierData.weightedRating,
        ratings_count: stat.votes,
        tier: tierData.tier,
        tier_rank: tierData.tierRank,
      };
    });
  }

  // Fallback for alternate spell schemas (e.g. spell_level / spell_name).
  const fallback = await supabase.from("spells").select("*");
  if (fallback.error || !fallback.data?.length) return [];

  const normalized = (fallback.data as Array<Record<string, unknown>>)
    .map((raw) => {
      const base = normalizeSpellRow(raw);
      if (!base) return null;
      return {
        id: base.id,
        name: base.name,
        level: base.level ?? null,
        school: base.school ?? null,
        type: base.type ?? null,
        average_rating: toNumberOrNull(raw.average_rating),
      } satisfies SpellListRow;
    })
    .filter((row): row is SpellListRow => row !== null);

  const ids = normalized.map((r) => r.id);
  const [globalAverage, voteStats] = await Promise.all([
    getGlobalAverageRating("spell_ratings"),
    getNumericEntityVoteStats("spell_ratings", "spell_id", ids),
  ]);
  return normalized
    .map((r) => {
      const stat = voteStats.get(r.id) ?? { votes: 0, rawAverage: Number(r.average_rating ?? 0) };
      const tierData = computeTierResult(stat.rawAverage, stat.votes, globalAverage);
      return {
        ...r,
        average_rating: stat.rawAverage,
        weighted_rating: tierData.weightedRating,
        ratings_count: stat.votes,
        tier: tierData.tier,
        tier_rank: tierData.tierRank,
      } satisfies SpellListRow;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getLeaderboardBuilds(limit = 150): Promise<BuildRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("builds").select("*").limit(limit);
  const rows = (data ?? []) as BuildRow[];
  const ids = rows.map((r) => r.id);
  const globalAverage = await getGlobalAverageRating("build_ratings");
  const voteStats = await getNumericEntityVoteStats("build_ratings", "build_id", ids);
  return rows
    .map((r) => {
      const stat = voteStats.get(r.id) ?? { votes: 0, rawAverage: Number(r.average_rating ?? 0) };
      const tierData = computeTierResult(stat.rawAverage, stat.votes, globalAverage);
      return {
        ...r,
        average_rating: stat.rawAverage,
        weighted_rating: tierData.weightedRating,
        tier: tierData.tier,
        tier_rank: tierData.tierRank,
        ratings_count: stat.votes,
      };
    })
    .sort(
      (a, b) =>
        (a as BuildRow & { tier_rank: number }).tier_rank - (b as BuildRow & { tier_rank: number }).tier_rank ||
        (b as BuildRow & { weighted_rating: number }).weighted_rating -
          (a as BuildRow & { weighted_rating: number }).weighted_rating ||
        (b as BuildRow & { ratings_count: number }).ratings_count -
          (a as BuildRow & { ratings_count: number }).ratings_count ||
        String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""))
    );
}

export async function cloneBuild(sourceBuildId: number) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Unauthorized");

  const supabase = await createClient();
  const source = await getBuildById(sourceBuildId);
  if (!source) throw new Error("Not found");

  const { data: inserted, error: insErr } = await supabase
    .from("builds")
    .insert({
      name: `${source.name} (copy)`,
      class: source.class,
      level: source.level,
      look_the_part: source.look_the_part,
      owner_id: userId,
      average_rating: 0,
      ruleset_version: source.ruleset_version ?? "V8.7",
      notes: source.notes ?? null,
      play_style: source.play_style ?? null,
      build_priority: source.build_priority ?? null,
      synergy: source.synergy ?? null,
      enemies: source.enemies ?? null,
      recommended_gear: source.recommended_gear ?? null,
    })
    .select("id")
    .single();

  if (insErr) throw insErr;
  const newId = inserted.id as number;

  const selections = await getBuildSpellSelections(sourceBuildId);
  if (selections.length > 0) {
    const payload = selections.map((s) => ({
      build_id: newId,
      spell_id: s.spell_id,
      spell_level: s.spell_level,
      purchased: s.purchased,
      experienced: s.experienced,
      selection_group: s.selection_group,
      chosen: s.chosen,
      metadata: s.metadata ?? {},
    }));
    const { error: selErr } = await supabase.from("build_spell_selections").insert(payload);
    if (selErr) throw selErr;
  }

  return newId;
}
