import Link from "next/link";
import PieChart from "@/components/PieChart";
import { createClient } from "@/lib/server/supabaseServer";

type StatRow = { label: string; count: number };
type RpcResult = {
  favorite_class: StatRow[];
  favorite_battle_game: StatRow[];
  favorite_spell: StatRow[];
};

function hashColor(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const hue = Math.abs(h) % 360;
  return `hsl(${hue} 70% 45%)`;
}

function pickClassColor(row: Record<string, unknown>): string | null {
  const candidates = [
    row.color,
    row.hex,
    row.hex_color,
    row.bg_color,
    row.background_color,
    row.primary_color,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return null;
}

export default async function FavoritesPage() {
  const supabase = await createClient();

  const [{ data: stats, error: statsError }, { data: classRows }] = await Promise.all([
    supabase.rpc("get_profile_favorites_stats"),
    supabase.from("classes").select("*"),
  ]);

  if (statsError) {
    return (
      <main className="p-10 text-white space-y-4">
        <h1 className="text-2xl font-bold">Favorites</h1>
        <p className="text-sm text-neutral-400">
          Could not load favorites stats. Make sure the SQL function{" "}
          <code className="text-neutral-300">get_profile_favorites_stats()</code> is applied.
        </p>
        <p className="text-sm text-red-400">{statsError.message}</p>
        <Link href="/profile" className="text-blue-400 underline text-sm">
          ← Back to profile
        </Link>
      </main>
    );
  }

  const payload = (stats as unknown as RpcResult) ?? {
    favorite_class: [],
    favorite_battle_game: [],
    favorite_spell: [],
  };

  const classColorByName = new Map<string, string>();
  for (const raw of (classRows ?? []) as Array<Record<string, unknown>>) {
    const name =
      (typeof raw.name === "string" && raw.name) ||
      (typeof raw.class_name === "string" && raw.class_name) ||
      (typeof raw.class === "string" && raw.class) ||
      null;
    if (!name) continue;
    const color = pickClassColor(raw);
    if (color) classColorByName.set(name, color);
  }

  const classSlices = (payload.favorite_class ?? []).map((r) => ({
    label: r.label,
    value: r.count,
    color: classColorByName.get(r.label) ?? hashColor(`class:${r.label}`),
  }));
  const gameSlices = (payload.favorite_battle_game ?? []).map((r) => ({
    label: r.label,
    value: r.count,
    color: hashColor(`game:${r.label}`),
  }));
  const spellSlices = (payload.favorite_spell ?? []).map((r) => ({
    label: r.label,
    value: r.count,
    color: hashColor(`spell:${r.label}`),
  }));

  return (
    <main className="p-10 text-white space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Favorites</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Pie charts are aggregated across all profiles (not per-user).
          </p>
        </div>
        <Link href="/profile" className="text-blue-400 underline text-sm">
          ← Back to profile
        </Link>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <PieChart title="Favorite class" slices={classSlices} size={360} />
        <PieChart title="Favorite battlegame" slices={gameSlices} size={360} />
        <PieChart title="Favorite spell" slices={spellSlices} size={360} />
      </div>
    </main>
  );
}

