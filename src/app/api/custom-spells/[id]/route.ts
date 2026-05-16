import { NextResponse } from "next/server";
import { createClient } from "@/lib/server/supabaseServer";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Params) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    const spellId = Number(id);

    const body = (await request.json()) as {
      name?: string;
      description?: string | null;
      spell_type?: string | null;
      school?: string | null;
      range?: string | null;
      incantation?: string | null;
      materials?: string | null;
      effect?: string | null;
      limitations?: string | null;
      notes?: string | null;
      image_url?: string | null;
    };
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

    const { error } = await supabase
      .from("custom_spells")
      .update({
        name,
        description: body.description ?? null,
        spell_type: body.spell_type ?? null,
        school: body.school ?? null,
        range: body.range ?? null,
        incantation: body.incantation ?? null,
        materials: body.materials ?? null,
        effect: body.effect ?? null,
        limitations: body.limitations ?? null,
        notes: body.notes ?? null,
        image_url: body.image_url ?? null,
      })
      .eq("id", spellId)
      .eq("owner_id", user.id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
