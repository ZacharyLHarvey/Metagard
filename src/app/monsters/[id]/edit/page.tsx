import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import MonsterForm, { type MonsterRow } from "@/components/MonsterForm";
import { getProfile } from "@/lib/queries/getProfile";
import { createClient } from "@/lib/server/supabaseServer";

type Params = { params: Promise<{ id: string }> };

export default async function EditMonsterPage({ params }: Params) {
  const { id } = await params;
  const mid = Number(id);
  const supabase = await createClient();
  const { data: row } = await supabase.from("monsters").select("*").eq("id", mid).maybeSingle();
  if (!row) notFound();

  const profile = await getProfile();
  const profileId = profile && "id" in profile && profile.id != null ? String(profile.id) : null;
  const ownerId = typeof row.owner_id === "string" ? row.owner_id : null;
  if (!profileId || profileId !== ownerId) redirect(`/monsters/${mid}`);

  const initial: MonsterRow = {
    id: mid,
    owner_id: ownerId ?? "",
    name: String(row.name),
    description: row.description != null ? String(row.description) : null,
    monster_type: row.monster_type != null ? String(row.monster_type) : null,
    threat_level: row.threat_level != null ? String(row.threat_level) : null,
    armor_points: row.armor_points != null ? String(row.armor_points) : null,
    abilities: row.abilities != null ? String(row.abilities) : null,
    immunities: row.immunities != null ? String(row.immunities) : null,
    image_url: row.image_url != null ? String(row.image_url) : null,
  };

  return (
    <main className="px-4 py-4 sm:px-6 lg:px-10 text-white max-w-2xl space-y-5 sm:space-y-6">
      <Link href={`/monsters/${mid}`} className="text-sm text-blue-400 hover:underline">
        ← Monster
      </Link>
      <h1 className="text-xl sm:text-2xl font-bold">Edit Monster</h1>
      <MonsterForm mode="edit" monsterId={mid} initial={initial} />
    </main>
  );
}
