import { NextResponse } from "next/server";
import { getDisplayNamesForOwnerIds } from "@/lib/queries/publicProfiles";
import { createClient } from "@/lib/server/supabaseServer";

type MonsterPickRow = {
  id: number;
  name: string;
  monster_type: string | null;
  threat_level: string | null;
  owner_id: string | null;
};

export type RandomMonsterResult = {
  id: number;
  name: string;
  monsterType: string | null;
  threatLevel: string | null;
  ownerId: string | null;
  creatorDisplayName?: string;
  href: string;
};

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("monsters")
      .select("id,name,monster_type,threat_level,owner_id");

    if (error) throw error;

    const rows = (data ?? []) as MonsterPickRow[];
    const poolSize = rows.length;

    if (poolSize === 0) {
      return NextResponse.json({ monster: null, poolSize: 0 });
    }

    const picked = rows[Math.floor(Math.random() * rows.length)]!;
    const creatorByOwnerId = await getDisplayNamesForOwnerIds([picked.owner_id]);
    const monster: RandomMonsterResult = {
      id: picked.id,
      name: picked.name,
      monsterType: picked.monster_type,
      threatLevel: picked.threat_level,
      ownerId: picked.owner_id,
      creatorDisplayName: picked.owner_id
        ? (creatorByOwnerId.get(picked.owner_id) ?? "Player")
        : undefined,
      href: `/monsters/${picked.id}`,
    };

    return NextResponse.json({ monster, poolSize });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to pick random monster";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
