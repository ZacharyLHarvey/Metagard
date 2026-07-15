import { NextResponse } from "next/server";
import { getGlobalAverageRating, getNumericEntityVoteStats } from "@/lib/queries/ratingStats";
import { createClient } from "@/lib/server/supabaseServer";
import { computeTierResult } from "@/lib/tier";

export async function GET(request: Request) {
  const supabase = await createClient();
  const url = new URL(request.url);
  const gameType = url.searchParams.get("gameType");
  let query = supabase
    .from("battle_games")
    .select("*")
    .order("average_rating", { ascending: false });
  if (gameType && gameType !== "All") query = query.eq("game_type", gameType);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const rows = (data ?? []) as Array<{ id: number; average_rating: number | null } & Record<string, unknown>>;
  const [globalAverage, voteStats] = await Promise.all([
    getGlobalAverageRating("battle_game_ratings"),
    getNumericEntityVoteStats("battle_game_ratings", "battle_game_id", rows.map((r) => r.id)),
  ]);
  const items = rows.map((r) => {
    const stat = voteStats.get(r.id) ?? { votes: 0, rawAverage: Number(r.average_rating ?? 0) };
    const tierData = computeTierResult(stat.rawAverage, stat.votes, globalAverage);
    return { ...r, weighted_rating: tierData.weightedRating, ratings_count: stat.votes, tier: tierData.tier };
  });
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

    const { data, error } = await supabase
      .from("battle_games")
      .insert({
        owner_id: user.id,
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
      .select("id")
      .single();
    if (error) throw error;
    return NextResponse.json({ id: data.id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
