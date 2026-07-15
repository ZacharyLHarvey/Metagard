import { NextResponse } from "next/server";
import { createClient } from "@/lib/server/supabaseServer";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Params) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    const battleGameId = Number(id);

    const body = (await request.json()) as {
      name?: string;
      description?: string | null;
      game_type?: string | null;
      lives?: string | null;
      respawn?: string | null;
      base?: string | null;
      teams?: string | null;
      objectives?: string | null;
      refresh?: string | null;
      equipment_needed?: string | null;
      time_limit?: string | null;
      scenario_rules?: string | null;
      image_url?: string | null;
      min_players?: number | null;
      max_players?: number | null;
      min_teams?: number | null;
      max_teams?: number | null;
    };
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

    const { error } = await supabase
      .from("battle_games")
      .update({
        name,
        description: body.description ?? null,
        game_type: body.game_type ?? null,
        lives: body.lives ?? null,
        respawn: body.respawn ?? null,
        base: body.base ?? null,
        teams: body.teams ?? null,
        objectives: body.objectives ?? null,
        refresh: body.refresh ?? null,
        equipment_needed: body.equipment_needed ?? null,
        time_limit: body.time_limit ?? null,
        scenario_rules: body.scenario_rules ?? null,
        image_url: body.image_url ?? null,
        min_players: typeof body.min_players === "number" ? body.min_players : null,
        max_players: typeof body.max_players === "number" ? body.max_players : null,
        min_teams: typeof body.min_teams === "number" ? body.min_teams : null,
        max_teams: typeof body.max_teams === "number" ? body.max_teams : null,
      })
      .eq("id", battleGameId)
      .eq("owner_id", user.id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
