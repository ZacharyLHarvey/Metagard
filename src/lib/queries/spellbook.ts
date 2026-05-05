import "server-only";
import { createClient } from "@/lib/server/supabaseServer";
import type {
  BuildRow,
  BuildSpellSelectionInput,
  BuildSpellSelectionRow,
  ClassRow,
  SpellRow,
} from "@/lib/spellbook/types";

async function getCurrentUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function getCatalogClasses() {
  const supabase = await createClient();
  const { data } = await supabase.from("classes").select("id,name").order("name");
  return (data ?? []) as ClassRow[];
}

export async function getCatalogSpellsForClass(className: string, maxLevel: number) {
  const supabase = await createClient();
  const primary = await supabase
    .from("spells")
    .select("id,name,level,school,type,range,materials,incantation,effect,limitation,note,cost,max,frequency,class")
    .eq("class", className)
    .lte("level", maxLevel)
    .order("level")
    .order("name");

  if (!primary.error) {
    return (primary.data ?? []) as SpellRow[];
  }

  // Fallback for schemas where class mapping is managed outside spell rows.
  const fallback = await supabase
    .from("spells")
    .select("id,name,level,school,type,range,materials,incantation,effect,limitation,note,cost,max,frequency")
    .lte("level", maxLevel)
    .order("level")
    .order("name");

  return (fallback.data ?? []) as SpellRow[];
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
      owner_id: userId,
      average_rating: 0,
      ruleset_version: "V8.7",
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id as number;
}

export async function upsertBuildSpellSelections(buildId: number, selections: BuildSpellSelectionInput[]) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Unauthorized");

  const supabase = await createClient();

  const { data: ownedBuild } = await supabase
    .from("builds")
    .select("id")
    .eq("id", buildId)
    .eq("owner_id", userId)
    .single();

  if (!ownedBuild) {
    throw new Error("Forbidden");
  }

  await supabase.from("build_spell_selections").delete().eq("build_id", buildId);

  if (selections.length === 0) return;

  const payload = selections.map((s) => ({
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
