import "server-only";
import { createClient } from "@/lib/server/supabaseServer";
import {
  getCustomBuildById,
  getCustomBuildSpellSelections,
  isCustomClassMartial,
  refreshCustomMartialBuildSelections,
  toHomeCustomBuildRow,
  type HomeCustomBuildRow,
} from "@/lib/queries/customClassSpellbook";
import type { CustomBuildSpellSelectionRow, SpellRefKind } from "@/lib/customClass/types";
import type { SpellRow } from "@/lib/spellbook/types";

async function getCurrentUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function resolveCustomBuildSideboardSpells(
  sideboard: Array<{ kind: SpellRefKind; id: number }> | undefined,
  catalogSpells: SpellRow[]
): Promise<SpellRow[]> {
  if (!sideboard?.length) return [];
  const resolved: SpellRow[] = [];
  const supabase = await createClient();

  for (const ref of sideboard) {
    const fromCatalog = catalogSpells.find((s) => {
      if (ref.kind === "custom") {
        return s.spell_kind === "custom" && (s.custom_spell_id ?? s.id) === ref.id;
      }
      return s.spell_kind !== "custom" && s.id === ref.id;
    });
    if (fromCatalog) {
      resolved.push(fromCatalog);
      continue;
    }

    if (ref.kind === "custom") {
      const { data } = await supabase.from("custom_spells").select("*").eq("id", ref.id).maybeSingle();
      if (data) {
        const row = data as Record<string, unknown>;
        resolved.push({
          id: ref.id,
          name: String(row.name ?? `Custom #${ref.id}`),
          level: null,
          school: typeof row.school === "string" ? row.school : null,
          type: typeof row.spell_type === "string" ? row.spell_type : null,
          range: typeof row.range === "string" ? row.range : null,
          materials: typeof row.materials === "string" ? row.materials : null,
          incantation: typeof row.incantation === "string" ? row.incantation : null,
          effect: typeof row.effect === "string" ? row.effect : null,
          limitation: typeof row.limitations === "string" ? row.limitations : null,
          note: typeof row.notes === "string" ? row.notes : null,
          cost: null,
          max: null,
          frequency: null,
          spell_kind: "custom",
          custom_spell_id: ref.id,
        });
      }
    } else {
      const { data } = await supabase.from("spells").select("*").eq("id", ref.id).maybeSingle();
      if (data) {
        const row = data as Record<string, unknown>;
        resolved.push({
          id: ref.id,
          name: String(row.name ?? `Spell #${ref.id}`),
          level: null,
          school: typeof row.school === "string" ? row.school : null,
          type: typeof row.type === "string" ? row.type : null,
          range: typeof row.range === "string" ? row.range : null,
          materials: typeof row.materials === "string" ? row.materials : null,
          incantation: typeof row.incantation === "string" ? row.incantation : null,
          effect: typeof row.effect === "string" ? row.effect : null,
          limitation: typeof row.limitation === "string" ? row.limitation : null,
          note: typeof row.note === "string" ? row.note : null,
          cost: null,
          max: null,
          frequency: null,
          spell_kind: "canonical",
        });
      }
    }
  }
  return resolved;
}

async function getCustomBuildSaveCount(
  supabase: Awaited<ReturnType<typeof createClient>>,
  buildId: number
): Promise<number> {
  const { data: row } = await supabase
    .from("custom_builds")
    .select("save_count")
    .eq("id", buildId)
    .maybeSingle();
  return Math.max(0, Number(row?.save_count ?? 0));
}

export async function getSavedCustomBuilds(): Promise<HomeCustomBuildRow[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("saved_custom_builds")
    .select("custom_build_id, custom_builds(id, name, level, owner_id, custom_classes(name))")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? [])
    .map((row) => {
      const build = row.custom_builds;
      if (!build || typeof build !== "object" || Array.isArray(build)) return null;
      return toHomeCustomBuildRow(build as Record<string, unknown>);
    })
    .filter((r): r is HomeCustomBuildRow => r != null);
}

export async function isCustomBuildSavedByCurrentUser(buildId: number): Promise<boolean> {
  const userId = await getCurrentUserId();
  if (!userId) return false;
  const supabase = await createClient();
  const { data } = await supabase
    .from("saved_custom_builds")
    .select("custom_build_id")
    .eq("user_id", userId)
    .eq("custom_build_id", buildId)
    .maybeSingle();
  return Boolean(data);
}

export async function toggleSavedCustomBuild(buildId: number) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Unauthorized");

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("saved_custom_builds")
    .select("custom_build_id")
    .eq("user_id", userId)
    .eq("custom_build_id", buildId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("saved_custom_builds")
      .delete()
      .eq("user_id", userId)
      .eq("custom_build_id", buildId);
    const saveCount = await getCustomBuildSaveCount(supabase, buildId);
    return { saved: false, saveCount };
  }

  await supabase.from("saved_custom_builds").insert({ user_id: userId, custom_build_id: buildId });
  const saveCount = await getCustomBuildSaveCount(supabase, buildId);
  return { saved: true, saveCount };
}

export async function cloneCustomBuild(sourceBuildId: number): Promise<number> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Unauthorized");

  const source = await getCustomBuildById(sourceBuildId);
  if (!source) throw new Error("Not found");

  const supabase = await createClient();
  const { data: inserted, error: insErr } = await supabase
    .from("custom_builds")
    .insert({
      name: `${source.name} (copy)`,
      custom_class_id: source.custom_class_id,
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
      sideboard: source.sideboard ?? [],
      cloned_from_custom_build_id: sourceBuildId,
    })
    .select("id")
    .single();

  if (insErr) throw insErr;
  const newId = inserted.id as number;

  const selections = await getCustomBuildSpellSelections(sourceBuildId);
  if (selections.length > 0) {
    const payload = selections.map((s: CustomBuildSpellSelectionRow) => ({
      custom_build_id: newId,
      spell_id: s.spell_id,
      custom_spell_id: s.custom_spell_id,
      spell_level: s.spell_level,
      purchased: s.purchased,
      experienced: s.experienced,
      selection_group: s.selection_group,
      chosen: s.chosen,
      metadata: s.metadata ?? {},
    }));
    const { error: selErr } = await supabase.from("custom_build_spell_selections").insert(payload);
    if (selErr) throw selErr;
  }

  const customClass = source.custom_class;
  if (customClass && isCustomClassMartial(customClass.class_type)) {
    await refreshCustomMartialBuildSelections(newId);
  }

  return newId;
}
