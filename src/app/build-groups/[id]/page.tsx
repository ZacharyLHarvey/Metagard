import Link from "next/link";
import { notFound } from "next/navigation";
import BuildTableBodyRow from "@/components/BuildTableBodyRow";
import CreatorAttribution from "@/components/CreatorAttribution";
import EntityRatingButtons from "@/components/EntityRatingButtons";
import TierBadge from "@/components/TierBadge";
import { normalizePositiveIntId } from "@/lib/buildGroups/normalizeIds";
import { getBuildGroupById, getBuildGroupMemberBuilds } from "@/lib/queries/buildGroups";
import { getDisplayNamesForOwnerIds } from "@/lib/queries/publicProfiles";
import { getProfile } from "@/lib/queries/getProfile";
import { getGlobalAverageRating, getNumericEntityVoteStats } from "@/lib/queries/ratingStats";
import { createClient } from "@/lib/server/supabaseServer";
import { computeTierResult } from "@/lib/tier";

type Params = { params: Promise<{ id: string }> };

export default async function BuildGroupDetailPage({ params }: Params) {
  const { id } = await params;
  const groupId = Number(id);
  const group = await getBuildGroupById(groupId);
  if (!group) notFound();

  const [memberBuilds, profile] = await Promise.all([
    getBuildGroupMemberBuilds(groupId),
    getProfile(),
  ]);

  const profileId = profile && "id" in profile && profile.id != null ? String(profile.id) : null;

  let myRating: number | null = null;
  if (profileId) {
    const supabase = await createClient();
    const { data: r } = await supabase
      .from("build_group_ratings")
      .select("rating")
      .eq("build_group_id", groupId)
      .eq("user_id", profileId)
      .maybeSingle();
    if (r && typeof r.rating === "number") myRating = r.rating;
  }

  const memberBuildIds = memberBuilds
    .map((b) => normalizePositiveIntId(b.id))
    .filter((id): id is number => id != null);
  const [globalAverage, voteStats, buildGlobalAverage, buildVoteStats, buildCreatorByOwnerId] =
    await Promise.all([
      getGlobalAverageRating("build_group_ratings"),
      getNumericEntityVoteStats("build_group_ratings", "build_group_id", [groupId]),
      getGlobalAverageRating("build_ratings"),
      getNumericEntityVoteStats("build_ratings", "build_id", memberBuildIds),
      getDisplayNamesForOwnerIds(memberBuilds.map((b) => b.owner_id)),
    ]);
  const stat = voteStats.get(groupId) ?? { votes: 0, rawAverage: Number(group.average_rating ?? 0) };
  const tierData = computeTierResult(stat.rawAverage, stat.votes, globalAverage);
  const canManage = profileId != null && profileId === group.owner_id;
  const creatorMap = await getDisplayNamesForOwnerIds([group.owner_id]);
  const creatorName = creatorMap.get(group.owner_id) ?? "Player";

  return (
    <main className="px-4 py-4 sm:px-6 lg:px-10 text-white space-y-5 sm:space-y-6 max-w-6xl">
      <Link href="/build-groups" className="text-sm text-blue-400 hover:underline">
        ← Build Groups
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold break-words">{group.name}</h1>
          {group.description ? (
            <p className="text-sm text-neutral-500 mt-2 whitespace-pre-wrap">{group.description}</p>
          ) : null}
          <div className="mt-2">
            <CreatorAttribution ownerId={group.owner_id} displayName={creatorName} />
          </div>
        </div>
        {canManage ? (
          <Link
            href={`/build-groups/${groupId}/edit`}
            className="px-3 py-2 bg-amber-600 rounded text-sm sm:text-base"
          >
            Edit Build Group
          </Link>
        ) : null}
      </div>

      <section className="rounded-lg border border-neutral-800 p-4">
        <p className="text-sm text-neutral-400">
          <TierBadge tier={tierData.tier} /> · Weighted:{" "}
          <span className="text-neutral-200 font-semibold">{tierData.weightedRating.toFixed(2)}</span> · Raw:{" "}
          <span className="text-neutral-200 font-semibold">{stat.rawAverage.toFixed(2)}</span> ★ · {stat.votes} vote
          {stat.votes === 1 ? "" : "s"}
        </p>
      </section>

      <section className="border border-neutral-800 rounded-lg p-4">
        <p className="text-sm text-neutral-400 mb-2">Your Rating</p>
        <EntityRatingButtons
          postUrl={`/api/build-groups/${groupId}/rating`}
          canRate={Boolean(profileId)}
          initialMyRating={myRating}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-200 border-b border-neutral-800 pb-2">
          Builds in this Group ({memberBuilds.length})
        </h2>
        {memberBuilds.length === 0 ? (
          <p className="text-neutral-500 text-sm">No builds in this group yet.</p>
        ) : (
          <>
            <style>
              {`
                .col-name { width: 28%; }
                .col-class { width: 15%; }
                .col-level { width: 10%; }
                .col-rating { width: 12%; }
                .col-look { width: 10%; }
              `}
            </style>
            <div className="border border-neutral-800 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm sm:text-base">
                  <thead className="bg-neutral-900">
                    <tr>
                      <th className="col-name px-4 py-2 border-b border-neutral-800 border-r border-neutral-800">
                        Name
                      </th>
                      <th className="col-class px-4 py-2 border-b border-neutral-800 border-r border-neutral-800">
                        Class
                      </th>
                      <th className="col-level px-4 py-1.5 leading-snug border-b border-neutral-800 border-r border-neutral-800">
                        Level
                      </th>
                      <th className="col-rating px-4 py-2 border-b border-neutral-800 border-r border-neutral-800">
                        Rating
                      </th>
                      <th className="col-look px-4 py-1.5 leading-snug border-b border-neutral-800 border-r border-neutral-800">
                        LTP
                      </th>
                      <th className="px-4 py-2 border-b border-neutral-800 min-w-[9rem]">
                        Creator
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {memberBuilds.map((b) => {
                      const buildId = normalizePositiveIntId(b.id);
                      if (buildId == null) return null;
                      const buildStat = buildVoteStats.get(buildId) ?? {
                        votes: 0,
                        rawAverage: Number(b.average_rating ?? 0),
                      };
                      const buildTierData = computeTierResult(
                        buildStat.rawAverage,
                        buildStat.votes,
                        buildGlobalAverage
                      );
                      return (
                        <BuildTableBodyRow
                          key={buildId}
                          buildId={buildId}
                          className="hover:bg-neutral-900/40 transition"
                        >
                          <td className="col-name px-4 py-2 border-b border-neutral-800 border-r border-neutral-800 break-words">
                            {b.name}
                          </td>
                          <td className="col-class px-4 py-2 border-b border-neutral-800 border-r border-neutral-800">
                            {b.class}
                          </td>
                          <td className="col-level px-4 py-1.5 leading-snug border-b border-neutral-800 border-r border-neutral-800">
                            {b.level}
                          </td>
                          <td className="col-rating px-4 py-2 border-b border-neutral-800 border-r border-neutral-800">
                            <div className="flex items-center gap-2">
                              <TierBadge tier={buildTierData.tier} />
                              <span>{buildTierData.weightedRating.toFixed(2)}</span>
                            </div>
                          </td>
                          <td className="col-look px-4 py-1.5 leading-snug border-b border-neutral-800 border-r border-neutral-800">
                            {b.look_the_part ? "✔️" : "—"}
                          </td>
                          <td className="px-4 py-2 border-b border-neutral-800 align-top">
                            <CreatorAttribution
                              ownerId={b.owner_id}
                              displayName={
                                b.owner_id
                                  ? (buildCreatorByOwnerId.get(b.owner_id) ?? "Player")
                                  : "Player"
                              }
                            />
                          </td>
                        </BuildTableBodyRow>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
