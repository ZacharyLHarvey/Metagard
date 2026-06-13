import "server-only";
import { createClient } from "@/lib/server/supabaseServer";
import { getGlobalAverageRating, getNumericEntityVoteStats } from "@/lib/queries/ratingStats";
import { computeTierResult, type TierLabel } from "@/lib/tier";

export type CustomSpellRow = {
  id: number;
  name: string;
  owner_id: string | null;
  description: string | null;
  image_url: string | null;
  spell_type: string | null;
  school: string | null;
  range: string | null;
  materials: string | null;
  incantation: string | null;
  effect: string | null;
  limitations: string | null;
  notes: string | null;
  average_rating?: number | null;
};

export type CustomSpellLeaderboardRow = {
  id: number;
  name: string;
  owner_id: string | null;
  average_rating: number;
  weighted_rating: number;
  tier: TierLabel;
  tier_rank: number;
  ratings_count: number;
};

export async function getCustomSpellById(id: number): Promise<CustomSpellRow | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("custom_spells").select("*").eq("id", id).maybeSingle();
  if (!data) return null;
  const row = data as Record<string, unknown>;
  return {
    id: Number(row.id),
    name: String(row.name ?? ""),
    owner_id: typeof row.owner_id === "string" ? row.owner_id : null,
    description: typeof row.description === "string" ? row.description : null,
    image_url: typeof row.image_url === "string" ? row.image_url : null,
    spell_type: typeof row.spell_type === "string" ? row.spell_type : null,
    school: typeof row.school === "string" ? row.school : null,
    range: typeof row.range === "string" ? row.range : null,
    materials: typeof row.materials === "string" ? row.materials : null,
    incantation: typeof row.incantation === "string" ? row.incantation : null,
    effect: typeof row.effect === "string" ? row.effect : null,
    limitations: typeof row.limitations === "string" ? row.limitations : null,
    notes: typeof row.notes === "string" ? row.notes : null,
    average_rating: typeof row.average_rating === "number" ? row.average_rating : null,
  };
}

export async function getCustomSpellLeaderboard(): Promise<CustomSpellLeaderboardRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("custom_spells").select("id, name, owner_id, average_rating");
  if (error) throw error;

  const rows = (data ?? []) as Array<{
    id: number;
    name: string;
    owner_id: string | null;
    average_rating: number | null;
  }>;

  if (rows.length === 0) return [];

  const globalAverage = await getGlobalAverageRating("custom_spell_ratings");
  const voteStats = await getNumericEntityVoteStats(
    "custom_spell_ratings",
    "custom_spell_id",
    rows.map((r) => r.id)
  );

  return rows
    .map((r) => {
      const stat = voteStats.get(r.id) ?? { votes: 0, rawAverage: Number(r.average_rating ?? 0) };
      const tierData = computeTierResult(stat.rawAverage, stat.votes, globalAverage);
      return {
        id: r.id,
        name: r.name,
        owner_id: typeof r.owner_id === "string" ? r.owner_id : null,
        average_rating: stat.rawAverage,
        weighted_rating: tierData.weightedRating,
        tier: tierData.tier,
        tier_rank: tierData.tierRank,
        ratings_count: stat.votes,
      };
    })
    .sort(
      (a, b) =>
        a.tier_rank - b.tier_rank ||
        b.weighted_rating - a.weighted_rating ||
        b.ratings_count - a.ratings_count ||
        a.name.localeCompare(b.name)
    );
}
