import { NextResponse } from "next/server";
import { createClient } from "@/lib/server/supabaseServer";

type BattlegameRow = {
  id: number;
  name: string;
  game_type?: string | null;
  description?: string | null;
  lives?: string | null;
  respawn?: string | null;
  base?: string | null;
  teams?: string | null;
  objectives?: string | null;
  refresh?: string | null;
  scenario_rules?: string | null;
  image_url?: string | null;
  min_players?: number | null;
  max_players?: number | null;
  min_teams?: number | null;
  max_teams?: number | null;
};

function inRange(value: number, min: number | null, max: number | null) {
  if (min != null && value < min) return false;
  if (max != null && value > max) return false;
  return true;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const gameType = url.searchParams.get("gameType") ?? "All";
    const playersRaw = url.searchParams.get("players");
    const teamsRaw = url.searchParams.get("teams");
    const players = playersRaw ? Number(playersRaw) : null;
    const teams = teamsRaw ? Number(teamsRaw) : null;

    const supabase = await createClient();
    let query = supabase.from("battle_games").select("*");
    if (gameType !== "All") query = query.eq("game_type", gameType);
    const { data, error } = await query;
    if (error) throw error;

    const rows = ((data ?? []) as BattlegameRow[]).filter((row) => {
      if (players != null && Number.isFinite(players)) {
        if (!inRange(players, row.min_players ?? null, row.max_players ?? null)) return false;
      }
      if (teams != null && Number.isFinite(teams)) {
        if (!inRange(teams, row.min_teams ?? null, row.max_teams ?? null)) return false;
      }
      return true;
    });

    if (rows.length === 0) {
      return NextResponse.json({ item: null, total: 0 });
    }
    const selected = rows[Math.floor(Math.random() * rows.length)];
    return NextResponse.json({ item: selected, total: rows.length });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to pick battlegame";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
