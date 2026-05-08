import Link from "next/link";
import { notFound } from "next/navigation";
import BuildCommentsSection from "@/components/BuildCommentsSection";
import BuildRatingSection from "@/components/BuildRatingSection";
import BuildSpellDetails from "@/components/BuildSpellDetails";
import CloneBuildButton from "@/components/CloneBuildButton";
import TierBadge from "@/components/TierBadge";
import { getGlobalAverageRating, getNumericEntityVoteStats } from "@/lib/queries/ratingStats";
import { getProfile } from "@/lib/queries/getProfile";
import {
  getBuildById,
  getBuildSpellSelections,
  getCatalogSpellsForClass,
  getClassEquipment,
} from "@/lib/queries/spellbook";
import { getMyBuildRating } from "@/lib/queries/social";
import { computeTierResult } from "@/lib/tier";
import { isMartialClass } from "@/lib/spellbook/martial";

type Params = {
  params: Promise<{ id: string }>;
};

export default async function BuildDetailsPage({ params }: Params) {
  const { id } = await params;
  const buildId = Number(id);

  const build = await getBuildById(buildId);
  if (!build) notFound();

  const [selections, spells, profile] = await Promise.all([
    getBuildSpellSelections(buildId),
    getCatalogSpellsForClass(build.class, build.level),
    getProfile(),
  ]);

  const profileId = profile && "id" in profile && profile.id != null ? String(profile.id) : null;
  const myRating = profileId ? await getMyBuildRating(buildId, profileId) : null;
  const [globalAverage, voteStats] = await Promise.all([
    getGlobalAverageRating("build_ratings"),
    getNumericEntityVoteStats("build_ratings", "build_id", [buildId]),
  ]);
  const stat = voteStats.get(buildId) ?? { votes: 0, rawAverage: Number(build.average_rating ?? 0) };
  const tierData = computeTierResult(stat.rawAverage, stat.votes, globalAverage);

  const canAct = Boolean(profile);
  const martial = isMartialClass(build.class);
  const equipment = martial ? await getClassEquipment(build.class) : null;

  return (
    <main className="p-10 text-white space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{build.name}</h1>
          <p className="text-neutral-400">
            {build.class} level {build.level} {build.look_the_part ? "- Look The Part" : ""}
          </p>
          {build.notes ? <p className="text-sm text-neutral-500 mt-2 whitespace-pre-wrap">{build.notes}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/builds/${build.id}/settings`} className="px-3 py-2 bg-neutral-700 rounded">
            Settings
          </Link>
          <Link href={`/builds/${build.id}/edit`} className="px-3 py-2 bg-amber-600 rounded">
            Edit Spells
          </Link>
        </div>
      </div>

      <section className="rounded-lg border border-neutral-800 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-neutral-400">
            <TierBadge tier={tierData.tier} /> · Weighted:{" "}
            <span className="text-neutral-200 font-semibold">{tierData.weightedRating.toFixed(2)}</span> · Raw:{" "}
            <span className="text-neutral-200 font-semibold">{stat.rawAverage.toFixed(2)}</span> ★ · {stat.votes} vote
            {stat.votes === 1 ? "" : "s"}
          </p>
          <CloneBuildButton buildId={buildId} canClone={canAct} />
        </div>
      </section>

      {martial ? (
        <section className="border border-neutral-800 rounded-lg overflow-hidden">
          <h3 className="px-4 py-2 bg-neutral-900 border-b border-neutral-800 font-semibold">Equipment</h3>
          <table className="w-full text-left border-collapse">
            <tbody>
              <tr>
                <td className="px-4 py-2 border-b border-neutral-800 text-neutral-400">Armor</td>
                <td className="px-4 py-2 border-b border-neutral-800">{equipment?.armor ?? "—"}</td>
              </tr>
              <tr>
                <td className="px-4 py-2 border-b border-neutral-800 text-neutral-400">Shields</td>
                <td className="px-4 py-2 border-b border-neutral-800">{equipment?.shields ?? "—"}</td>
              </tr>
              <tr>
                <td className="px-4 py-2 border-b border-neutral-800 text-neutral-400">Weapons</td>
                <td className="px-4 py-2 border-b border-neutral-800">{equipment?.weapons ?? "—"}</td>
              </tr>
            </tbody>
          </table>
        </section>
      ) : null}

      <BuildSpellDetails
        selections={selections}
        spells={spells}
        className={build.class}
        lookThePart={build.look_the_part}
      />
      {martial ? (
        <p className="text-xs text-neutral-400">
          Martial class build: abilities are auto-assigned by class/level. Look The Part grants class-specific LTP ability only.
        </p>
      ) : null}

      <section className="space-y-3 text-sm text-neutral-300 max-w-3xl">
        <section className="rounded-lg border border-neutral-800 p-4 bg-neutral-900/30 space-y-1">
          <p className="text-neutral-500 font-medium">Playstyle</p>
          <p className="text-xs text-neutral-400">
            How this build is meant to approach fights, objectives, and battlefield movement.
          </p>
          <p className="whitespace-pre-wrap text-neutral-200">{build.play_style ?? "—"}</p>
        </section>

        <section className="rounded-lg border border-neutral-800 p-4 bg-neutral-900/30 space-y-1">
          <p className="text-neutral-500 font-medium">Priority</p>
          <p className="text-xs text-neutral-400">
            What you should focus on first when playing this build in a Battlegame.
          </p>
          <p className="whitespace-pre-wrap text-neutral-200">{build.build_priority ?? "—"}</p>
        </section>

        <section className="rounded-lg border border-neutral-800 p-4 bg-neutral-900/30 space-y-1">
          <p className="text-neutral-500 font-medium">Synergy</p>
          <p className="text-xs text-neutral-400">
            Which classes, teammates, or abilities enhance this build’s effectiveness.
          </p>
          <p className="whitespace-pre-wrap text-neutral-200">{build.synergy ?? "—"}</p>
        </section>

        <section className="rounded-lg border border-neutral-800 p-4 bg-neutral-900/30 space-y-1">
          <p className="text-neutral-500 font-medium">Enemies</p>
          <p className="text-xs text-neutral-400">
            The classes or tactics that most threaten this build during Battlegames.
          </p>
          <p className="whitespace-pre-wrap text-neutral-200">{build.enemies ?? "—"}</p>
        </section>

        <section className="rounded-lg border border-neutral-800 p-4 bg-neutral-900/30 space-y-1">
          <p className="text-neutral-500 font-medium">Recommended Gear</p>
          <p className="text-xs text-neutral-400">
            The weapons, shields, and equipment that best support this build’s playstyle.
          </p>
          <p className="whitespace-pre-wrap text-neutral-200">{build.recommended_gear ?? "—"}</p>
        </section>
      </section>

      <section className="rounded-lg border border-neutral-800 p-4 space-y-3">
        <p className="text-sm text-neutral-400">Rate this build</p>
        <BuildRatingSection buildId={buildId} canRate={canAct} initialMyRating={myRating} />
      </section>

      <BuildCommentsSection buildId={buildId} canComment={canAct} />
    </main>
  );
}
