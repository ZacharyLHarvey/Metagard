import { NextResponse } from "next/server";
import { createClient } from "@/lib/server/supabaseServer";
import { getEntityCommentsWithAuthors, type EntityCommentTable } from "@/lib/queries/social";

export type EntityCommentsConfig = {
  table: EntityCommentTable;
  fkColumn: string;
};

type RouteContext = { params: Promise<{ id: string }> };

export function createEntityCommentsRouteHandlers(config: EntityCommentsConfig) {
  async function GET(_: Request, context: RouteContext) {
    const { id } = await context.params;
    const entityId = Number(id);
    const rows = await getEntityCommentsWithAuthors(config.table, config.fkColumn, entityId);
    return NextResponse.json({ comments: rows });
  }

  async function POST(request: Request, context: RouteContext) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      const { id } = await context.params;
      const entityId = Number(id);
      const body = (await request.json()) as { body?: string };
      const text = typeof body.body === "string" ? body.body.trim() : "";
      if (!text) return NextResponse.json({ error: "body required" }, { status: 400 });

      let error;
      switch (config.table) {
        case "build_comments":
          ({ error } = await supabase.from("build_comments").insert({
            build_id: entityId,
            user_id: user.id,
            body: text,
          }));
          break;
        case "battle_game_comments":
          ({ error } = await supabase.from("battle_game_comments").insert({
            battle_game_id: entityId,
            user_id: user.id,
            body: text,
          }));
          break;
        case "monster_comments":
          ({ error } = await supabase.from("monster_comments").insert({
            monster_id: entityId,
            user_id: user.id,
            body: text,
          }));
          break;
        case "custom_spell_comments":
          ({ error } = await supabase.from("custom_spell_comments").insert({
            custom_spell_id: entityId,
            user_id: user.id,
            body: text,
          }));
          break;
        case "custom_class_comments":
          ({ error } = await supabase.from("custom_class_comments").insert({
            custom_class_id: entityId,
            user_id: user.id,
            body: text,
          }));
          break;
        case "custom_build_comments":
          ({ error } = await supabase.from("custom_build_comments").insert({
            custom_build_id: entityId,
            user_id: user.id,
            body: text,
          }));
          break;
      }
      if (error) throw error;

      return NextResponse.json({ ok: true });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to post comment";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  return { GET, POST };
}
