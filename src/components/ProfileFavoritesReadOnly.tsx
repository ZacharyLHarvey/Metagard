type Props = {
  sectionTitle: string;
  favoriteClass: string;
  favoriteBattleGame: string;
  favoriteSpell: string;
};

export default function ProfileFavoritesReadOnly({
  sectionTitle,
  favoriteClass,
  favoriteBattleGame,
  favoriteSpell,
}: Props) {
  return (
    <section className="space-y-4 max-w-lg border border-neutral-800 rounded-lg p-4">
      <h2 className="text-lg font-semibold">{sectionTitle}</h2>
      <p className="text-sm text-neutral-500">Catalog favorites stored on this profile.</p>
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-neutral-400">Favorite Class</dt>
          <dd className="text-neutral-200 mt-0.5">{favoriteClass.trim() || "—"}</dd>
        </div>
        <div>
          <dt className="text-neutral-400">Favorite Battlegame</dt>
          <dd className="text-neutral-200 mt-0.5">{favoriteBattleGame.trim() || "—"}</dd>
        </div>
        <div>
          <dt className="text-neutral-400">Favorite Spell</dt>
          <dd className="text-neutral-200 mt-0.5">{favoriteSpell.trim() || "—"}</dd>
        </div>
      </dl>
    </section>
  );
}
