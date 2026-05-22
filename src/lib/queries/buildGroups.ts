import "server-only";
import { normalizePositiveIntId } from "@/lib/buildGroups/normalizeIds";
import { createClient } from "@/lib/server/supabaseServer";
import type { BuildGroupMemberBuild, BuildGroupRow } from "@/lib/buildGroups/types";
import { getGlobalAverageRating, getNumericEntityVoteStats } from "@/lib/queries/ratingStats";
import { computeTierResult } from "@/lib/tier";

export async function getBuildGroupById(id: number): Promise<BuildGroupRow | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("build_groups").select("*").eq("id", id).maybeSingle();
  return data ? (data as BuildGroupRow) : null;
}

export async function getBuildGroupMemberBuilds(groupId: number): Promise<BuildGroupMemberBuild[]> {
  const supabase = await createClient();
  const { data: links } = await supabase
    .from("build_group_builds")
    .select("build_id")
    .eq("build_group_id", groupId);
  const buildIds = ((links ?? []) as Array<{ build_id: unknown }>)
    .map((l) => normalizePositiveIntId(l.build_id))
    .filter((id): id is number => id != null);
  if (buildIds.length === 0) return [];

  const { data: builds } = await supabase
    .from("builds")
    .select("id, name, class, level, average_rating, owner_id, look_the_part")
    .in("id", buildIds)
    .order("class", { ascending: true })
    .order("level", { ascending: true })
    .order("name", { ascending: true });

  return (builds ?? []) as BuildGroupMemberBuild[];
}

export async function getBuildGroupsForBuild(
  buildId: number
): Promise<Array<{ id: number; name: string }>> {
  const supabase = await createClient();
  const { data: links } = await supabase
    .from("build_group_builds")
    .select("build_group_id")
    .eq("build_id", buildId);
  const groupIds = ((links ?? []) as Array<{ build_group_id: number }>).map((l) => l.build_group_id);
  if (groupIds.length === 0) return [];

  const { data: groups } = await supabase
    .from("build_groups")
    .select("id, name")
    .in("id", groupIds)
    .order("name", { ascending: true });

  return (groups ?? []) as Array<{ id: number; name: string }>;
}

export async function getBuildGroupMemberCounts(groupIds: number[]): Promise<Map<number, number>> {
  const result = new Map<number, number>();
  if (groupIds.length === 0) return result;

  const supabase = await createClient();
  const { data } = await supabase
    .from("build_group_builds")
    .select("build_group_id")
    .in("build_group_id", groupIds);

  for (const row of (data ?? []) as Array<{ build_group_id: unknown }>) {
    const gid = normalizePositiveIntId(row.build_group_id);
    if (gid == null) continue;
    result.set(gid, (result.get(gid) ?? 0) + 1);
  }
  return result;
}

export type LeaderboardBuildGroupRow = BuildGroupRow & {
  weighted_rating: number;
  tier: string;
  tier_rank: number;
  ratings_count: number;
};

export async function getLeaderboardBuildGroups(limit = 150): Promise<LeaderboardBuildGroupRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("build_groups").select("*").limit(limit);
  const rows = (data ?? []) as BuildGroupRow[];
  const ids = rows.map((r) => r.id);
  const globalAverage = await getGlobalAverageRating("build_group_ratings");
  const voteStats = await getNumericEntityVoteStats("build_group_ratings", "build_group_id", ids);

  return rows
    .map((r) => {
      const stat = voteStats.get(r.id) ?? { votes: 0, rawAverage: Number(r.average_rating ?? 0) };
      const tierData = computeTierResult(stat.rawAverage, stat.votes, globalAverage);
      return {
        ...r,
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
        String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""))
    );
}
