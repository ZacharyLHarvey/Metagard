import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import DeleteBuildButton from "@/components/DeleteBuildButton";
import ProfileFavoritesForm from "@/components/ProfileFavoritesForm";
import ProfileFavoritesReadOnly from "@/components/ProfileFavoritesReadOnly";
import UnsaveSavedBuildButton from "@/components/UnsaveSavedBuildButton";
import { getProfile } from "@/lib/queries/getProfile";
import {
  getAllSpellsList,
  getCatalogClasses,
  getBuildsOwnedByUser,
  getSavedBuildsForUser,
} from "@/lib/queries/spellbook";
import {
  displayNameFromProfileRow,
  getDisplayNamesForOwnerIds,
  getProfileRowByUserId,
  isProfileUserIdParam,
} from "@/lib/queries/publicProfiles";
import CreatorAttribution from "@/components/CreatorAttribution";
import { createClient } from "@/lib/server/supabaseServer";
import type { BuildRow } from "@/lib/spellbook/types";

type Params = { params: Promise<{ userId: string }> };

export default async function UserProfilePage({ params }: Params) {
  const { userId } = await params;
  if (!isProfileUserIdParam(userId)) notFound();

  const viewedProfile = await getProfileRowByUserId(userId);
  if (!viewedProfile) notFound();

  const viewer = await getProfile();
  const viewerId = viewer && "id" in viewer && viewer.id != null ? String(viewer.id) : null;
  const isOwnProfile = viewerId != null && viewerId === userId;
  const displayName = displayNameFromProfileRow(viewedProfile);

  const [ownedBuilds, savedBuilds, classes, battleGames, spells] = await Promise.all([
    getBuildsOwnedByUser(userId),
    getSavedBuildsForUser(userId),
    getCatalogClasses(),
    (async () => {
      const supabase = await createClient();
      return supabase.from("battle_games").select("name").order("name");
    })(),
    getAllSpellsList(),
  ]);

  const favClass = typeof viewedProfile.favorite_class === "string" ? viewedProfile.favorite_class : "";
  const favGame =
    typeof viewedProfile.favorite_battle_game === "string" ? viewedProfile.favorite_battle_game : "";
  const favSpell = typeof viewedProfile.favorite_spell === "string" ? viewedProfile.favorite_spell : "";
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

  const profileTitle = isOwnProfile ? "Your profile" : `${displayName}'s Profile`;
  const buildsHeading = isOwnProfile ? "My builds" : `${displayName}'s Builds`;
  const savedHeading = isOwnProfile ? "Saved Builds" : `${displayName}'s Saved Builds`;
  const createdEmpty = isOwnProfile
    ? "You have not created any builds yet."
    : `${displayName} has not created any builds yet.`;
  const savedEmpty = isOwnProfile
    ? "No saved builds. Save from the public builds list."
    : `${displayName} has not saved any builds yet.`;

  const creatorByOwnerId = await getDisplayNamesForOwnerIds([
    ...ownedBuilds.map((b) => b.owner_id),
    ...savedBuilds.map((b) => b.owner_id),
  ]);

  return (
    <main className="min-h-screen bg-neutral-950 text-white px-4 py-4 sm:px-6 lg:px-10 space-y-8 sm:space-y-10 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold">{profileTitle}</h1>
        {isOwnProfile && viewer && typeof viewer.display_name === "string" ? (
          <p className="mt-2 text-neutral-400">
            Signed in as <span className="text-neutral-200">{viewer.display_name}</span>
          </p>
        ) : (
          <p className="mt-2 text-neutral-400">
            Public profile · <span className="text-neutral-200">{displayName}</span>
          </p>
        )}
      </div>

      {isOwnProfile ? (
        <ProfileFavoritesForm
          initialFavoriteClass={favClass}
          initialFavoriteBattleGame={favGame}
          initialFavoriteSpell={favSpell}
          classOptions={classOptions}
          battleGameOptions={battleGameOptions}
          spellOptions={spellOptions}
        />
      ) : (
        <ProfileFavoritesReadOnly
          sectionTitle={`${displayName}'s Favorites`}
          favoriteClass={favClass}
          favoriteBattleGame={favGame}
          favoriteSpell={favSpell}
        />
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{buildsHeading}</h2>
        <BuildTable
          builds={ownedBuilds}
          creatorByOwnerId={creatorByOwnerId}
          empty={createdEmpty}
          extraActions={
            isOwnProfile
              ? (b) => (
                  <>
                    <Link
                      href={`/builds/${b.id}/edit`}
                      className="px-3 py-1 bg-amber-600 hover:bg-amber-700 rounded text-sm"
                    >
                      Edit
                    </Link>
                    <DeleteBuildButton buildId={b.id} />
                  </>
                )
              : undefined
          }
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{savedHeading}</h2>
        <BuildTable
          builds={savedBuilds}
          creatorByOwnerId={creatorByOwnerId}
          empty={savedEmpty}
          trailingActions={isOwnProfile ? (b) => <UnsaveSavedBuildButton buildId={b.id} /> : undefined}
        />
      </section>
    </main>
  );
}

function BuildTable({
  builds,
  creatorByOwnerId,
  empty,
  extraActions,
  trailingActions,
}: {
  builds: BuildRow[];
  creatorByOwnerId: Map<string, string>;
  empty: string;
  extraActions?: (b: BuildRow) => ReactNode;
  trailingActions?: (b: BuildRow) => ReactNode;
}) {
  if (builds.length === 0) {
    return <p className="text-sm text-neutral-500">{empty}</p>;
  }

  return (
    <div className="border border-neutral-800 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
      <table className="w-full text-left text-sm border-collapse">
        <thead className="bg-neutral-900">
          <tr>
            <th className="px-4 py-2 border-b border-neutral-800">Name</th>
            <th className="px-4 py-2 border-b border-neutral-800">Class</th>
            <th className="px-4 py-2 border-b border-neutral-800">Level</th>
            <th className="px-4 py-2 border-b border-neutral-800 min-w-[9rem]">Creator</th>
            <th className="px-4 py-2 border-b border-neutral-800 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {builds.map((b) => (
            <tr key={b.id} className="hover:bg-neutral-900/40">
              <td className="px-4 py-2 border-b border-neutral-800">{b.name}</td>
              <td className="px-4 py-2 border-b border-neutral-800">{b.class}</td>
              <td className="px-4 py-2 border-b border-neutral-800">{b.level}</td>
              <td className="px-4 py-2 border-b border-neutral-800 align-top">
                <CreatorAttribution
                  ownerId={b.owner_id}
                  displayName={
                    b.owner_id ? (creatorByOwnerId.get(b.owner_id) ?? "Player") : "Player"
                  }
                />
              </td>
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
    </div>
  );
}
