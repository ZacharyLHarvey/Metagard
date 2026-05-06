import { NextResponse } from "next/server";
import { getGlobalAverageRating, getNumericEntityVoteStats } from "@/lib/queries/ratingStats";
import { createClient } from "@/lib/server/supabaseServer";
import { computeTierResult } from "@/lib/tier";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("monsters").select("*").order("average_rating", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const rows = (data ?? []) as Array<{ id: number; average_rating: number | null } & Record<string, unknown>>;
  const [globalAverage, voteStats] = await Promise.all([
    getGlobalAverageRating("monster_ratings"),
    getNumericEntityVoteStats("monster_ratings", "monster_id", rows.map((r) => r.id)),
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

    const body = (await request.json()) as { name?: string; description?: string | null };
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

    const { data, error } = await supabase
      .from("monsters")
      .insert({ owner_id: user.id, name, description: body.description ?? null })
      .select("id")
      .single();
    if (error) throw error;
    return NextResponse.json({ id: data.id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
