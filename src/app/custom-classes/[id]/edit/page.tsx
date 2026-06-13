import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import CustomClassWizard from "@/components/customClass/CustomClassWizard";
import type { CustomClassRow, CustomClassSpellRuleRow } from "@/lib/customClass/types";
import { getCustomClassRules } from "@/lib/queries/customClassSpellbook";
import { getProfile } from "@/lib/queries/getProfile";
import { createClient } from "@/lib/server/supabaseServer";

type Params = { params: Promise<{ id: string }> };

export default async function EditCustomClassPage({ params }: Params) {
  const { id } = await params;
  const eid = Number(id);
  const supabase = await createClient();
  const { data: row } = await supabase.from("custom_classes").select("*").eq("id", eid).maybeSingle();
  if (!row) notFound();

  const profile = await getProfile();
  const profileId = profile && "id" in profile && profile.id != null ? String(profile.id) : null;
  const ownerId = typeof row.owner_id === "string" ? row.owner_id : null;
  if (!profileId || profileId !== ownerId) redirect(`/custom-classes/${eid}`);

  const initial: CustomClassRow = {
    id: eid,
    owner_id: ownerId ?? "",
    name: String(row.name),
    description: row.description != null ? String(row.description) : null,
    class_type: row.class_type === "caster" ? "caster" : "martial",
    armor: row.armor != null ? String(row.armor) : null,
    shields: row.shields != null ? String(row.shields) : null,
    weapons: row.weapons != null ? String(row.weapons) : null,
  };

  let initialRules: CustomClassSpellRuleRow[] = [];
  try {
    initialRules = await getCustomClassRules(eid);
  } catch {
    initialRules = [];
  }

  return (
    <main className="px-4 py-4 sm:px-6 lg:px-10 text-white max-w-4xl space-y-6">
      <Link href={`/custom-classes/${eid}`} className="text-sm text-blue-400 hover:underline">
        ← Custom Class
      </Link>
      <h1 className="text-2xl font-bold">Edit Custom Class</h1>
      <CustomClassWizard mode="edit" classId={eid} initial={initial} initialRules={initialRules} />
    </main>
  );
}
