import { NextResponse } from "next/server";
import { getGlobalAverageRating, getNumericEntityVoteStats } from "@/lib/queries/ratingStats";
import { createClient } from "@/lib/server/supabaseServer";
import { computeTierResult } from "@/lib/tier";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Params) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    const entityId = Number(id);
    const body = (await request.json()) as { rating?: number };
    const rating = body.rating;
    if (typeof rating !== "number" || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return NextResponse.json({ error: "rating must be integer 1–5" }, { status: 400 });
    }

    const { error } = await supabase.from("battle_game_ratings").upsert(
      { user_id: user.id, battle_game_id: entityId, rating },
      { onConflict: "user_id,battle_game_id" }
    );
    if (error) throw error;
    const [globalAverage, voteStats] = await Promise.all([
      getGlobalAverageRating("battle_game_ratings"),
      getNumericEntityVoteStats("battle_game_ratings", "battle_game_id", [entityId]),
    ]);
    const stat = voteStats.get(entityId) ?? { votes: 0, rawAverage: 0 };
    const tierData = computeTierResult(stat.rawAverage, stat.votes, globalAverage);
    return NextResponse.json({
      ok: true,
      weighted_rating: tierData.weightedRating,
      tier: tierData.tier,
      ratings_count: stat.votes,
      raw_average: stat.rawAverage,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
