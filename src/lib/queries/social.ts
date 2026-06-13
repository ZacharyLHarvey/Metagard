import "server-only";
import { createClient } from "@/lib/server/supabaseServer";

export type EntityCommentRow = {
  id: number;
  body: string;
  created_at: string;
  display_name: string | null;
};

export type BuildCommentRow = EntityCommentRow;

export type EntityCommentTable =
  | "build_comments"
  | "battle_game_comments"
  | "monster_comments"
  | "custom_spell_comments"
  | "custom_class_comments"
  | "custom_build_comments";

export async function getEntityCommentsWithAuthors(
  table: EntityCommentTable,
  fkColumn: string,
  entityId: number,
): Promise<EntityCommentRow[]> {
  const supabase = await createClient();
  let query;
  switch (table) {
    case "build_comments":
      query = supabase
        .from("build_comments")
        .select("id, build_id, user_id, body, created_at")
        .eq("build_id", entityId);
      break;
    case "battle_game_comments":
      query = supabase
        .from("battle_game_comments")
        .select("id, battle_game_id, user_id, body, created_at")
        .eq("battle_game_id", entityId);
      break;
    case "monster_comments":
      query = supabase
        .from("monster_comments")
        .select("id, monster_id, user_id, body, created_at")
        .eq("monster_id", entityId);
      break;
    case "custom_spell_comments":
      query = supabase
        .from("custom_spell_comments")
        .select("id, custom_spell_id, user_id, body, created_at")
        .eq("custom_spell_id", entityId);
      break;
    case "custom_class_comments":
      query = supabase
        .from("custom_class_comments")
        .select("id, custom_class_id, user_id, body, created_at")
        .eq("custom_class_id", entityId);
      break;
    case "custom_build_comments":
      query = supabase
        .from("custom_build_comments")
        .select("id, custom_build_id, user_id, body, created_at")
        .eq("custom_build_id", entityId);
      break;
    default:
      return [];
  }
  const { data: comments, error } = await query.order("created_at", { ascending: true });

  if (error || !comments?.length) return [];

  const ids = [...new Set(comments.map((c) => c.user_id as string))];
  const { data: profiles } = await supabase.from("profiles").select("id, display_name").in("id", ids);
  const nameById = new Map((profiles ?? []).map((p) => [p.id as string, (p.display_name as string) ?? null]));

  return comments.map((c) => ({
    id: c.id as number,
    body: c.body as string,
    created_at: c.created_at as string,
    display_name: nameById.get(c.user_id as string) ?? null,
  }));
}

export async function getBuildCommentsWithAuthors(buildId: number): Promise<BuildCommentRow[]> {
  return getEntityCommentsWithAuthors("build_comments", "build_id", buildId);
}

export async function getMyBuildRating(buildId: number, userId: string): Promise<number | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("build_ratings")
    .select("rating")
    .eq("build_id", buildId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data || typeof data.rating !== "number") return null;
  return data.rating;
}

export async function getMyCustomBuildRating(buildId: number, userId: string): Promise<number | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("custom_build_ratings")
    .select("rating")
    .eq("custom_build_id", buildId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data || typeof data.rating !== "number") return null;
  return data.rating;
}

export async function getMySpellRating(spellId: number, userId: string): Promise<number | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("spell_ratings")
    .select("rating")
    .eq("spell_id", spellId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data || typeof data.rating !== "number") return null;
  return data.rating;
}

export async function getMyClassRating(className: string, userId: string): Promise<number | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("class_ratings")
    .select("rating")
    .eq("class_name", className)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data || typeof data.rating !== "number") return null;
  return data.rating;
}
