import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import CustomSpellForm, { type CustomSpellRow } from "@/components/CustomSpellForm";
import { getProfile } from "@/lib/queries/getProfile";
import { createClient } from "@/lib/server/supabaseServer";

type Params = { params: Promise<{ id: string }> };

export default async function EditCustomSpellPage({ params }: Params) {
  const { id } = await params;
  const eid = Number(id);
  const supabase = await createClient();
  const { data: row } = await supabase.from("custom_spells").select("*").eq("id", eid).maybeSingle();
  if (!row) notFound();

  const profile = await getProfile();
  const profileId = profile && "id" in profile && profile.id != null ? String(profile.id) : null;
  const ownerId = typeof row.owner_id === "string" ? row.owner_id : null;
  if (!profileId || profileId !== ownerId) redirect(`/custom-spells/${eid}`);

  const initial: CustomSpellRow = {
    id: eid,
    owner_id: ownerId ?? "",
    name: String(row.name),
    description: row.description != null ? String(row.description) : null,
    spell_type: row.spell_type != null ? String(row.spell_type) : null,
    school: row.school != null ? String(row.school) : null,
    range: row.range != null ? String(row.range) : null,
    incantation: row.incantation != null ? String(row.incantation) : null,
    materials: row.materials != null ? String(row.materials) : null,
    effect: row.effect != null ? String(row.effect) : null,
    limitations: row.limitations != null ? String(row.limitations) : null,
    notes: row.notes != null ? String(row.notes) : null,
    image_url: row.image_url != null ? String(row.image_url) : null,
  };

  return (
    <main className="px-4 py-4 sm:px-6 lg:px-10 text-white max-w-2xl space-y-5 sm:space-y-6">
      <Link href={`/custom-spells/${eid}`} className="text-sm text-blue-400 hover:underline">
        ← Custom Spell
      </Link>
      <h1 className="text-xl sm:text-2xl font-bold">Edit Custom Spell</h1>
      <CustomSpellForm mode="edit" spellId={eid} initial={initial} />
    </main>
  );
}
