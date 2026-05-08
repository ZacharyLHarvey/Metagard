import type { ReactNode } from "react";
import Link from "next/link";
import DeleteBuildButton from "@/components/DeleteBuildButton";
import ProfileFavoritesForm from "@/components/ProfileFavoritesForm";
import UnsaveSavedBuildButton from "@/components/UnsaveSavedBuildButton";
import { getProfile } from "@/lib/queries/getProfile";
import { getAllSpellsList, getCatalogClasses, getMyBuilds, getSavedBuilds } from "@/lib/queries/spellbook";
import { createClient } from "@/lib/server/supabaseServer";
import type { BuildRow } from "@/lib/spellbook/types";

export default async function ProfilePage() {
  const profile = await getProfile();

  if (!profile) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white px-4 py-4 sm:px-6 lg:px-10">
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="mt-4 text-neutral-400">
          <Link href="/login" className="text-blue-400 underline">
            Sign in
          </Link>{" "}
          to view your profile.
        </p>
      </main>
    );
  }

  const supabase = await createClient();
  const [myBuilds, savedBuilds, classes, battleGames, spells] = await Promise.all([
    getMyBuilds(),
    getSavedBuilds(),
    getCatalogClasses(),
    supabase.from("battle_games").select("name").order("name"),
    getAllSpellsList(),
  ]);
  const favClass = typeof profile.favorite_class === "string" ? profile.favorite_class : "";
  const favGame =
    typeof profile.favorite_battle_game === "string" ? profile.favorite_battle_game : "";
  const favSpell = typeof profile.favorite_spell === "string" ? profile.favorite_spell : "";
  const classOptions = Array.from(
    new Set(
      [...classes.map((item) => item.name), favClass]
        .map((name) => name.trim())
        .filter((name) => name.length > 0)
    )
  ).sort((a, b) => a.localeCompare(b));
  const battleGameOptions = Array.from(
    new Set(
      [
        ...(battleGames.data ?? [])
          .map((item) => (typeof item.name === "string" ? item.name : ""))
          .filter((name) => name.trim().length > 0),
        favGame,
      ]
        .map((name) => name.trim())
        .filter((name) => name.length > 0)
    )
  ).sort((a, b) => a.localeCompare(b));
  const spellOptions = Array.from(
    new Set(
      [...spells.map((item) => item.name), favSpell]
        .map((name) => name.trim())
        .filter((name) => name.length > 0)
    )
  ).sort((a, b) => a.localeCompare(b));

  return (
    <main className="min-h-screen bg-neutral-950 text-white px-4 py-4 sm:px-6 lg:px-10 space-y-8 sm:space-y-10 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold">Your profile</h1>
        <p className="mt-2 text-neutral-400">
          Signed in as <span className="text-neutral-200">{profile.display_name}</span>
        </p>
      </div>

      <ProfileFavoritesForm
        initialFavoriteClass={favClass}
        initialFavoriteBattleGame={favGame}
        initialFavoriteSpell={favSpell}
        classOptions={classOptions}
        battleGameOptions={battleGameOptions}
        spellOptions={spellOptions}
      />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">My builds</h2>
        <BuildTable
          builds={myBuilds}
          empty="You have not created any builds yet."
          extraActions={(b) => (
            <>
              <Link
                href={`/builds/${b.id}/edit`}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 rounded text-sm"
              >
                Edit
              </Link>
              <DeleteBuildButton buildId={b.id} />
            </>
          )}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Saved builds</h2>
        <BuildTable
          builds={savedBuilds}
          empty="No saved builds. Save from the public builds list."
          trailingActions={(b) => <UnsaveSavedBuildButton buildId={b.id} />}
        />
      </section>
    </main>
  );
}

function BuildTable({
  builds,
  empty,
  extraActions,
  trailingActions,
}: {
  builds: BuildRow[];
  empty: string;
  extraActions?: (b: BuildRow) => ReactNode;
  trailingActions?: (b: BuildRow) => ReactNode;
}) {
  if (builds.length === 0) {
    return <p className="text-sm text-neutral-500">{empty}</p>;
  }

  return (
    <div className="border border-neutral-800 rounded-lg overflow-x-auto">
      <table className="w-full text-left text-sm border-collapse">
        <thead className="bg-neutral-900">
          <tr>
            <th className="px-4 py-2 border-b border-neutral-800">Name</th>
            <th className="px-4 py-2 border-b border-neutral-800">Class</th>
            <th className="px-4 py-2 border-b border-neutral-800">Level</th>
            <th className="px-4 py-2 border-b border-neutral-800 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {builds.map((b) => (
            <tr key={b.id} className="hover:bg-neutral-900/40">
              <td className="px-4 py-2 border-b border-neutral-800">{b.name}</td>
              <td className="px-4 py-2 border-b border-neutral-800">{b.class}</td>
              <td className="px-4 py-2 border-b border-neutral-800">{b.level}</td>
              <td className="px-4 py-2 border-b border-neutral-800 text-right">
                <div className="flex justify-start sm:justify-end flex-wrap gap-2">
                  <Link
                    href={`/builds/${b.id}`}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                  >
                    View
                  </Link>
                  {extraActions ? extraActions(b) : null}
                  {trailingActions ? trailingActions(b) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
