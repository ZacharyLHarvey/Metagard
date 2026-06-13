import { NextResponse } from "next/server";
import {
  createCustomClassWithRules,
  getCustomClassById,
  getCustomClassRules,
} from "@/lib/queries/customClassSpellbook";
import { parseCustomClassPayload } from "@/lib/customClass/parsePayload";
import { getGlobalAverageRating, getNumericEntityVoteStats } from "@/lib/queries/ratingStats";
import { createClient } from "@/lib/server/supabaseServer";
import { computeTierResult } from "@/lib/tier";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const includeRules = searchParams.get("include") === "rules";
  const idParam = searchParams.get("id");

  if (idParam) {
    const classId = Number(idParam);
    const row = await getCustomClassById(classId);
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const rules = includeRules ? await getCustomClassRules(classId) : undefined;
    return NextResponse.json({ item: row, rules });
  }

  const { data, error } = await supabase
    .from("custom_classes")
    .select("*")
    .order("average_rating", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const rows = (data ?? []) as Array<{ id: number; average_rating: number | null } & Record<string, unknown>>;
  const [globalAverage, voteStats] = await Promise.all([
    getGlobalAverageRating("custom_class_ratings"),
    getNumericEntityVoteStats("custom_class_ratings", "custom_class_id", rows.map((r) => r.id)),
  ]);
  const items = rows.map((r) => {
    const stat = voteStats.get(r.id) ?? { votes: 0, rawAverage: Number(r.average_rating ?? 0) };
    const tierData = computeTierResult(stat.rawAverage, stat.votes, globalAverage);
    return { ...r, weighted_rating: tierData.weightedRating, ratings_count: stat.votes, tier: tierData.tier };
  });
  return NextResponse.json({ items });
}

function parsePayload(body: Record<string, unknown>) {
  return parseCustomClassPayload(body);
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await request.json()) as Record<string, unknown>;
    const payload = parsePayload(body);
    const id = await createCustomClassWithRules(user.id, payload);
    return NextResponse.json({ id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
