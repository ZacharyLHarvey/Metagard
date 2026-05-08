import Link from "next/link";
import { notFound } from "next/navigation";
import EntityRatingButtons from "@/components/EntityRatingButtons";
import TierBadge from "@/components/TierBadge";
import { getProfile } from "@/lib/queries/getProfile";
import { getClassById, getClassLeaderboard } from "@/lib/queries/spellbook";
import { getMyClassRating } from "@/lib/queries/social";

type Params = { params: Promise<{ id: string }> };

export default async function ClassDetailPage({ params }: Params) {
  const { id } = await params;
  const classId = Number(id);
  const klass = await getClassById(classId);
  if (!klass) notFound();

  const [leaderboard, profile] = await Promise.all([getClassLeaderboard(), getProfile()]);
  const stat = leaderboard.find((row) => row.id === classId) ?? {
    id: classId,
    name: klass.name,
    average_rating: 0,
    weighted_rating: 0,
    tier: "C",
    tier_rank: 4,
    ratings_count: 0,
  };

  const profileId = profile && "id" in profile && profile.id != null ? String(profile.id) : null;
  const myRating = profileId ? await getMyClassRating(klass.name, profileId) : null;

  return (
    <main className="p-10 text-white max-w-2xl space-y-6">
      <Link href="/classes" className="text-sm text-blue-400 hover:underline">
        ← Classes
      </Link>
      <h1 className="text-2xl font-bold">{klass.name}</h1>
      <p className="text-sm text-neutral-400">
        <TierBadge tier={stat.tier as "S+" | "S" | "A" | "B" | "C" | "D" | "F"} /> · {stat.weighted_rating.toFixed(2)} · Raw ★ {stat.average_rating.toFixed(2)} · {stat.ratings_count} vote
        {stat.ratings_count === 1 ? "" : "s"}
      </p>

      <section className="border border-neutral-800 rounded-lg p-4">
        <p className="text-sm text-neutral-400 mb-2">Rate this class</p>
        <EntityRatingButtons
          postUrl={`/api/classes/${classId}/rating`}
          canRate={Boolean(profileId)}
          initialMyRating={myRating}
        />
      </section>
    </main>
  );
}

