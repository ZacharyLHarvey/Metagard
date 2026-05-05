import { NextResponse } from "next/server";
import { upsertBuildSpellSelections } from "@/lib/queries/spellbook";
import type { BuildSpellSelectionInput } from "@/lib/spellbook/types";
import { createClient } from "@/lib/server/supabaseServer";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, context: Params) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      selections?: BuildSpellSelectionInput[];
    };
    await upsertBuildSpellSelections(Number(id), body.selections ?? []);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save spells";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: Params) {
  try {
    const supabase = await createClient();
    const { id } = await context.params;
    const buildId = Number(id);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: build } = await supabase
      .from("builds")
      .select("id")
      .eq("id", buildId)
      .eq("owner_id", user.id)
      .single();

    if (!build) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { error } = await supabase.from("build_spell_selections").delete().eq("build_id", buildId);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to clear spells";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
