import Link from "next/link";
import { notFound } from "next/navigation";
import CreatorAttribution from "@/components/CreatorAttribution";
import CustomClassCatalogView from "@/components/customClass/CustomClassCatalogView";
import EntityCommentsSection from "@/components/EntityCommentsSection";
import EntityRatingButtons from "@/components/EntityRatingButtons";
import TierBadge from "@/components/TierBadge";
import type { CustomClassType } from "@/lib/customClass/types";
import {
  getCustomClassById,
  getCustomClassLeaderboard,
  getCustomClassRules,
} from "@/lib/queries/customClassSpellbook";
import { getDisplayNamesForOwnerIds } from "@/lib/queries/publicProfiles";
import { getProfile } from "@/lib/queries/getProfile";
import { createClient } from "@/lib/server/supabaseServer";

type Params = { params: Promise<{ id: string }> };

export default async function CustomClassDetailPage({ params }: Params) {
  const { id } = await params;
  const eid = Number(id);
  const klass = await getCustomClassById(eid);
  if (!klass) notFound();

  const [leaderboard, profile, rules] = await Promise.all([
    getCustomClassLeaderboard(),
    getProfile(),
    getCustomClassRules(eid).catch(() => []),
  ]);
  const stat = leaderboard.find((row) => row.id === eid) ?? {
    id: eid,
    name: klass.name,
    average_rating: 0,
    weighted_rating: 0,
    tier: "C" as const,
    tier_rank: 4,
    ratings_count: 0,
  };

  const profileId = profile && "id" in profile && profile.id != null ? String(profile.id) : null;

  let myRating: number | null = null;
  if (profileId) {
    const supabase = await createClient();
    const { data: r } = await supabase
      .from("custom_class_ratings")
      .select("rating")
      .eq("custom_class_id", eid)
      .eq("user_id", profileId)
      .maybeSingle();
    if (r && typeof r.rating === "number") myRating = r.rating;
  }

  const ownerId = klass.owner_id ?? null;
  const canManage = profileId != null && profileId === ownerId;
  const creatorMap = await getDisplayNamesForOwnerIds([ownerId]);
  const creatorName = ownerId ? (creatorMap.get(ownerId) ?? "Player") : "Player";

  const classType: CustomClassType = klass.class_type === "caster" ? "caster" : "martial";

  return (
    <main className="p-10 text-white max-w-2xl space-y-6">
      <Link href="/custom-classes" className="text-sm text-blue-400 hover:underline">
        ← Custom Classes
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{klass.name}</h1>
          <p className="text-sm text-neutral-400 mt-1">
            <span className="inline-block px-2 py-0.5 rounded-full border border-neutral-700 text-xs mr-2">
              {classType === "martial" ? "Martial" : "Caster"}
            </span>
            Custom class
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManage ? (
            <Link href={`/custom-classes/${eid}/edit`} className="px-3 py-2 bg-amber-600 rounded text-sm">
              Edit
            </Link>
          ) : null}
          <Link
            href={`/create-custom-build?classId=${eid}`}
            className="px-3 py-2 bg-blue-600 rounded text-sm"
          >
            Create build
          </Link>
        </div>
      </div>
      <p className="text-sm text-neutral-400">
        <TierBadge tier={stat.tier} /> · {stat.weighted_rating.toFixed(2)} · Raw ★{" "}
        {stat.average_rating.toFixed(2)} · {stat.ratings_count} vote
        {stat.ratings_count === 1 ? "" : "s"}
      </p>

      <section className="border border-neutral-800 rounded-lg p-4">
        <p className="text-sm text-neutral-400 mb-2">Rate This Class</p>
        <EntityRatingButtons
          postUrl={`/api/custom-classes/${eid}/rating`}
          canRate={Boolean(profileId)}
          initialMyRating={myRating}
        />
      </section>

      <CreatorAttribution ownerId={ownerId} displayName={creatorName} />
      {klass.description ? (
        <p className="text-sm whitespace-pre-wrap text-neutral-300">{klass.description}</p>
      ) : null}

      <section className="border border-neutral-800 rounded-lg overflow-hidden">
        <h3 className="px-4 py-2 bg-neutral-900 border-b border-neutral-800 font-semibold">Equipment</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <tbody>
              <tr>
                <td className="px-4 py-2 border-b border-neutral-800 text-neutral-400">Armor</td>
                <td className="px-4 py-2 border-b border-neutral-800">{klass.armor ?? "—"}</td>
              </tr>
              <tr>
                <td className="px-4 py-2 border-b border-neutral-800 text-neutral-400">Shields</td>
                <td className="px-4 py-2 border-b border-neutral-800">{klass.shields ?? "—"}</td>
              </tr>
              <tr>
                <td className="px-4 py-2 border-b border-neutral-800 text-neutral-400">Weapons</td>
                <td className="px-4 py-2 border-b border-neutral-800">{klass.weapons ?? "—"}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <CustomClassCatalogView classType={classType} rules={rules} />

      <p className="text-xs text-neutral-500">
        Custom classes use only the abilities defined above—official archetype grant spells and
        archetype equipment overrides do not apply.
      </p>

      <EntityCommentsSection
        commentsApiUrl={`/api/custom-classes/${eid}/comments`}
        canComment={Boolean(profileId)}
      />
    </main>
  );
}
