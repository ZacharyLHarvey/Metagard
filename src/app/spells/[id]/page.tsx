import Link from "next/link";
import { notFound } from "next/navigation";
import EntityRatingButtons from "@/components/EntityRatingButtons";
import { getProfile } from "@/lib/queries/getProfile";
import { getSpellById } from "@/lib/queries/spellbook";
import { getMySpellRating } from "@/lib/queries/social";

type Params = { params: Promise<{ id: string }> };

export default async function SpellDetailPage({ params }: Params) {
  const { id } = await params;
  const spellId = Number(id);
  const row = await getSpellById(spellId);
  if (!row) notFound();

  const profile = await getProfile();
  const profileId = profile && "id" in profile && profile.id != null ? String(profile.id) : null;
  const myRating = profileId ? await getMySpellRating(spellId, profileId) : null;

  const name = String(row.name ?? "");
  const avg = Number(row.average_rating ?? 0);

  return (
    <main className="p-10 text-white space-y-6 max-w-3xl">
      <Link href="/spells" className="text-sm text-blue-400 hover:underline">
        ← Spells
      </Link>
      <h1 className="text-2xl font-bold">{name}</h1>
      <p className="text-neutral-400 text-sm">
        {String(row.type ?? "—")} · {String(row.school ?? "—")}
        {row.level != null ? ` · circle ${row.level}` : ""} · avg ★ {avg.toFixed(2)}
      </p>

      <section className="border border-neutral-800 rounded-lg p-4 space-y-2">
        <p className="text-sm text-neutral-400">Rate this spell</p>
        <EntityRatingButtons
          postUrl={`/api/spells/${spellId}/rating`}
          canRate={Boolean(profileId)}
          initialMyRating={myRating}
        />
      </section>

      {row.effect ? (
        <div>
          <h2 className="font-semibold text-neutral-300 mb-1">Effect</h2>
          <p className="text-sm whitespace-pre-wrap text-neutral-200">{String(row.effect)}</p>
        </div>
      ) : null}
      {row.materials ? (
        <p className="text-sm text-neutral-400">Materials: {String(row.materials)}</p>
      ) : null}
      {row.incantation ? (
        <p className="text-sm text-neutral-400 whitespace-pre-wrap">Incantation: {String(row.incantation)}</p>
      ) : null}
    </main>
  );
}
