"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  initialFavoriteClass: string;
  initialFavoriteBattleGame: string;
  initialFavoriteSpell: string;
  classOptions: string[];
  battleGameOptions: string[];
  spellOptions: string[];
};

export default function ProfileFavoritesForm({
  initialFavoriteClass,
  initialFavoriteBattleGame,
  initialFavoriteSpell,
  classOptions,
  battleGameOptions,
  spellOptions,
}: Props) {
  const router = useRouter();
  const [favoriteClass, setFavoriteClass] = useState(initialFavoriteClass);
  const [favoriteBattleGame, setFavoriteBattleGame] = useState(initialFavoriteBattleGame);
  const [favoriteSpell, setFavoriteSpell] = useState(initialFavoriteSpell);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        favorite_class: favoriteClass.trim() || null,
        favorite_battle_game: favoriteBattleGame.trim() || null,
        favorite_spell: favoriteSpell.trim() || null,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setMessage(body.error ?? "Could not save");
      return;
    }
    setMessage("Saved.");
    router.refresh();
  }

  return (
    <form onSubmit={save} className="space-y-4 max-w-lg border border-neutral-800 rounded-lg p-4">
      <h2 className="text-lg font-semibold">Favorites</h2>
      <p className="text-sm text-neutral-500">Choose your favorites from the current catalog.</p>
      <div>
        <label className="block text-sm text-neutral-400 mb-1">Favorite class</label>
        <select
          className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded"
          value={favoriteClass}
          onChange={(e) => setFavoriteClass(e.target.value)}
        >
          <option value="">No favorite class</option>
          {classOptions.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm text-neutral-400 mb-1">Favorite battlegame</label>
        <select
          className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded"
          value={favoriteBattleGame}
          onChange={(e) => setFavoriteBattleGame(e.target.value)}
        >
          <option value="">No favorite battlegame</option>
          {battleGameOptions.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm text-neutral-400 mb-1">Favorite spell</label>
        <select
          className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded"
          value={favoriteSpell}
          onChange={(e) => setFavoriteSpell(e.target.value)}
        >
          <option value="">No favorite spell</option>
          {spellOptions.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>
      <button type="submit" disabled={busy} className="px-4 py-2 bg-blue-600 rounded text-sm">
        {busy ? "Saving…" : "Save favorites"}
      </button>
      {message ? <p className="text-sm text-neutral-400">{message}</p> : null}
    </form>
  );
}
