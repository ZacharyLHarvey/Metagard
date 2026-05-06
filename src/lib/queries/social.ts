import "server-only";
import { createClient } from "@/lib/server/supabaseServer";

export type BuildCommentRow = {
  id: number;
  build_id: number;
  user_id: string;
  body: string;
  created_at: string;
  display_name: string | null;
};

export async function getBuildCommentsWithAuthors(buildId: number): Promise<BuildCommentRow[]> {
  const supabase = await createClient();
  const { data: comments, error } = await supabase
    .from("build_comments")
    .select("id, build_id, user_id, body, created_at")
    .eq("build_id", buildId)
    .order("created_at", { ascending: true });

  if (error || !comments?.length) return [];

  const ids = [...new Set(comments.map((c) => c.user_id as string))];
  const { data: profiles } = await supabase.from("profiles").select("id, display_name").in("id", ids);
  const nameById = new Map((profiles ?? []).map((p) => [p.id as string, (p.display_name as string) ?? null]));

  return comments.map((c) => ({
    id: c.id as number,
    build_id: c.build_id as number,
    user_id: c.user_id as string,
    body: c.body as string,
    created_at: c.created_at as string,
    display_name: nameById.get(c.user_id as string) ?? null,
  }));
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
