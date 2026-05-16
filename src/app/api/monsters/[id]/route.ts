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
    const monsterId = Number(id);

    const body = (await request.json()) as {
      name?: string;
      description?: string | null;
      monster_type?: string | null;
      threat_level?: string | null;
      armor_points?: string | null;
      abilities?: string | null;
      immunities?: string | null;
      image_url?: string | null;
    };
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

    const { error } = await supabase
      .from("monsters")
      .update({
        name,
        description: body.description ?? null,
        monster_type: body.monster_type ?? null,
        threat_level: body.threat_level ?? null,
        armor_points: body.armor_points ?? null,
        abilities: body.abilities ?? null,
        immunities: body.immunities ?? null,
        image_url: body.image_url ?? null,
      })
      .eq("id", monsterId)
      .eq("owner_id", user.id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
