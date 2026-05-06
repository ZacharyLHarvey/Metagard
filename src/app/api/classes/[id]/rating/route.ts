import { NextResponse } from "next/server";
import { getGlobalAverageRating, getStringEntityVoteStats } from "@/lib/queries/ratingStats";
import { createClient } from "@/lib/server/supabaseServer";
import { getClassById } from "@/lib/queries/spellbook";
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
    const classId = Number(id);
    if (!Number.isFinite(classId)) return NextResponse.json({ error: "Invalid class id" }, { status: 400 });

    const klass = await getClassById(classId);
    if (!klass) return NextResponse.json({ error: "Class not found" }, { status: 404 });

    const body = (await request.json()) as { rating?: number };
    const rating = body.rating;
    if (typeof rating !== "number" || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return NextResponse.json({ error: "rating must be integer 1–5" }, { status: 400 });
    }

    const { error } = await supabase.from("class_ratings").upsert(
      { user_id: user.id, class_name: klass.name, rating },
      { onConflict: "user_id,class_name" }
    );
    if (error) throw error;

    const [globalAverage, voteStats] = await Promise.all([
      getGlobalAverageRating("class_ratings"),
      getStringEntityVoteStats("class_ratings", "class_name", [klass.name]),
    ]);
    const stat = voteStats.get(klass.name) ?? { votes: 0, rawAverage: 0 };
    const tierData = computeTierResult(stat.rawAverage, stat.votes, globalAverage);
    return NextResponse.json({
      ok: true,
      weighted_rating: tierData.weightedRating,
      tier: tierData.tier,
      ratings_count: stat.votes,
      raw_average: stat.rawAverage,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to save class rating";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

