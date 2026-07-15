import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import BattlegameForm from "@/components/BattlegameForm";
import { getProfile } from "@/lib/queries/getProfile";
import type { BattlegameRow } from "@/lib/battlegames";
import { createClient } from "@/lib/server/supabaseServer";

type Params = { params: Promise<{ id: string }> };

export default async function EditBattleGamePage({ params }: Params) {
  const { id } = await params;
  const eid = Number(id);
  const supabase = await createClient();
  const { data: row } = await supabase.from("battle_games").select("*").eq("id", eid).maybeSingle();
  if (!row) notFound();

  const profile = await getProfile();
  const profileId = profile && "id" in profile && profile.id != null ? String(profile.id) : null;
  const ownerId = typeof row.owner_id === "string" ? row.owner_id : null;
  if (!profileId || profileId !== ownerId) redirect(`/battlegames/${eid}`);

  const initial: BattlegameRow = {
    id: eid,
    owner_id: ownerId ?? "",
    name: String(row.name),
    description: row.description != null ? String(row.description) : null,
    game_type: row.game_type != null ? String(row.game_type) : null,
    lives: row.lives != null ? String(row.lives) : null,
    respawn: row.respawn != null ? String(row.respawn) : null,
    base: row.base != null ? String(row.base) : null,
    teams: row.teams != null ? String(row.teams) : null,
    objectives: row.objectives != null ? String(row.objectives) : null,
    refresh: row.refresh != null ? String(row.refresh) : null,
    equipment_needed: row.equipment_needed != null ? String(row.equipment_needed) : null,
    time_limit: row.time_limit != null ? String(row.time_limit) : null,
    scenario_rules: row.scenario_rules != null ? String(row.scenario_rules) : null,
    image_url: row.image_url != null ? String(row.image_url) : null,
    min_players: typeof row.min_players === "number" ? row.min_players : null,
    max_players: typeof row.max_players === "number" ? row.max_players : null,
    min_teams: typeof row.min_teams === "number" ? row.min_teams : null,
    max_teams: typeof row.max_teams === "number" ? row.max_teams : null,
  };

  return (
    <main className="px-4 py-4 sm:px-6 lg:px-10 text-white max-w-2xl space-y-5 sm:space-y-6">
      <Link href={`/battlegames/${eid}`} className="text-sm text-blue-400 hover:underline">
        ← Battlegame
      </Link>
      <h1 className="text-xl sm:text-2xl font-bold">Edit Battlegame</h1>
      <BattlegameForm mode="edit" battlegameId={eid} initial={initial} />
    </main>
  );
}
