import { NextResponse } from "next/server";
import { CASTER_CLASSES } from "@/lib/spellbook/casterBudget";
import { MARTIAL_CLASS_NAMES } from "@/lib/spellbook/martial";
import { getCatalogClasses } from "@/lib/queries/spellbook";
import { getDisplayNamesForOwnerIds } from "@/lib/queries/publicProfiles";
import { createClient } from "@/lib/server/supabaseServer";

type BuildPickRow = {
  id: number;
  name: string;
  class: string;
  level: number;
  look_the_part: boolean | null;
  owner_id: string | null;
};

export type RandomBuildResult = {
  id: number;
  name: string;
  class: string;
  level: number;
  lookThePart: boolean;
  ownerId: string | null;
  creatorDisplayName?: string;
  href: string;
};

function parseMaxLevel(raw: string | null): number | null {
  if (raw == null || raw.trim() === "") return null;
  const n = Number(raw.trim());
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1 || n > 6) return null;
  return n;
}

async function resolveGroupFilter(group: string): Promise<string> {
  if (group === "all" || group === "martial" || group === "caster") return group;
  const classes = await getCatalogClasses();
  const known = new Set(classes.map((c) => c.name));
  return known.has(group) ? group : "all";
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const groupRaw = url.searchParams.get("group") ?? "all";
    const group = await resolveGroupFilter(groupRaw);
    const maxLevel = parseMaxLevel(url.searchParams.get("maxLevel"));

    const supabase = await createClient();
    let query = supabase
      .from("builds")
      .select("id,name,class,level,look_the_part,owner_id");

    if (maxLevel != null) query = query.lte("level", maxLevel);
    if (group === "martial") query = query.in("class", [...MARTIAL_CLASS_NAMES]);
    else if (group === "caster") query = query.in("class", [...CASTER_CLASSES]);
    else if (group !== "all") query = query.eq("class", group);

    const { data, error } = await query;
    if (error) throw error;

    const rows = (data ?? []) as BuildPickRow[];
    const poolSize = rows.length;

    if (poolSize === 0) {
      return NextResponse.json({ build: null, poolSize: 0 });
    }

    const picked = rows[Math.floor(Math.random() * rows.length)]!;
    const creatorByOwnerId = await getDisplayNamesForOwnerIds([picked.owner_id]);
    const build: RandomBuildResult = {
      id: picked.id,
      name: picked.name,
      class: picked.class,
      level: picked.level,
      lookThePart: picked.look_the_part === true,
      ownerId: picked.owner_id,
      creatorDisplayName: picked.owner_id
        ? (creatorByOwnerId.get(picked.owner_id) ?? "Player")
        : undefined,
      href: `/builds/${picked.id}`,
    };

    return NextResponse.json({ build, poolSize });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to pick random build";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
