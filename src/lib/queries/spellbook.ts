import "server-only";
import { createClient } from "@/lib/server/supabaseServer";
import type {
  BuildRow,
  BuildSpellSelectionInput,
  BuildSpellSelectionRow,
  ClassRow,
  SpellRow,
} from "@/lib/spellbook/types";

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
    materials: toStringOrNull(row.materials),
    incantation: toStringOrNull(row.incantation),
    effect: toStringOrNull(row.effect),
    limitation: toStringOrNull(row.limitation),
    note: toStringOrNull(row.note),
    cost: toNumberOrNull(row.cost),
    max: toNumberOrNull(row.max) ?? toNumberOrNull(row.max_count),
    frequency: toStringOrNull(row.frequency),
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

  // Last-resort fallback: derive class names from spells catalog.
  const spellsFallback = await supabase.from("spells").select("class");
  if (!spellsFallback.error && (spellsFallback.data?.length ?? 0) > 0) {
    const classSet = new Set<string>();
    for (const row of spellsFallback.data as Array<Record<string, unknown>>) {
      const value = row.class;
      if (typeof value === "string" && value.trim().length > 0) {
        classSet.add(value.trim());
      }
    }
    return Array.from(classSet)
      .sort((a, b) => a.localeCompare(b))
      .map((name, index) => ({ id: index + 1, name }));
  }

  return [];
}

export async function getCatalogSpellsForClass(className: string, maxLevel: number) {
  const supabase = await createClient();
  const raw = await supabase.from("spells").select("*");
  if (raw.error || !raw.data) return [];

  const pairs = (raw.data as Array<Record<string, unknown>>)
    .map((row) => ({ row, spell: normalizeSpellRow(row) }))
    .filter((pair) => Boolean(pair.spell)) as Array<{ row: Record<string, unknown>; spell: SpellRow }>;

  const classFiltered = pairs.filter(({ row }) => {
    const mappedClass =
      toStringOrNull(row.class) ??
      toStringOrNull(row.class_name) ??
      toStringOrNull(row.className);
    if (!mappedClass) return true;
    return mappedClass.trim().toLowerCase() === className.trim().toLowerCase();
  });

  const levelFiltered = classFiltered.map((pair) => pair.spell).filter((spell) => {
    if (spell.level === null) return true;
    return spell.level <= maxLevel;
  });

  return levelFiltered.sort((a, b) => {
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
