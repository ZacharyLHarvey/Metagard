import { NextResponse } from "next/server";
import {
  getCustomBuildById,
  refreshCustomMartialBuildSelections,
} from "@/lib/queries/customClassSpellbook";
import { createClient } from "@/lib/server/supabaseServer";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, context: Params) {
  const { id } = await context.params;
  const build = await getCustomBuildById(Number(id));
  if (!build) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ item: build });
}

export async function PATCH(request: Request, context: Params) {
  try {
    const supabase = await createClient();
    const { id } = await context.params;
    const buildId = Number(id);
    const body = (await request.json()) as {
      name?: string;
      level?: number;
      lookThePart?: boolean;
      notes?: string | null;
      playStyle?: string | null;
      priority?: string | null;
      synergy?: string | null;
      enemies?: string | null;
      recommendedGear?: string | null;
    };

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const patch: Record<string, unknown> = {};
    if (typeof body.name === "string" && body.name.trim().length > 0) patch.name = body.name.trim();
    if (typeof body.level === "number" && body.level >= 1 && body.level <= 6) patch.level = body.level;
    if (typeof body.lookThePart === "boolean") patch.look_the_part = body.lookThePart;
    if (typeof body.notes === "string" || body.notes === null) patch.notes = body.notes;
    if (typeof body.playStyle === "string" || body.playStyle === null) patch.play_style = body.playStyle;
    if (typeof body.priority === "string" || body.priority === null) patch.build_priority = body.priority;
    if (typeof body.synergy === "string" || body.synergy === null) patch.synergy = body.synergy;
    if (typeof body.enemies === "string" || body.enemies === null) patch.enemies = body.enemies;
    if (typeof body.recommendedGear === "string" || body.recommendedGear === null)
      patch.recommended_gear = body.recommendedGear;

    const { error } = await supabase
      .from("custom_builds")
      .update(patch)
      .eq("id", buildId)
      .eq("owner_id", user.id);
    if (error) throw error;

    await refreshCustomMartialBuildSelections(buildId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update build";
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

    const { error } = await supabase
      .from("custom_builds")
      .delete()
      .eq("id", buildId)
      .eq("owner_id", user.id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete build";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
