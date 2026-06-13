import { NextResponse } from "next/server";
import { createCustomBuild } from "@/lib/queries/customClassSpellbook";
import { createClient } from "@/lib/server/supabaseServer";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let query = supabase
    .from("custom_builds")
    .select("*, custom_classes(id,name,class_type)")
    .order("created_at", { ascending: false });

  if (user) {
    query = query.eq("owner_id", user.id);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      customClassId?: number;
      level?: number;
      lookThePart?: boolean;
      playStyle?: string | null;
      priority?: string | null;
      synergy?: string | null;
      enemies?: string | null;
      recommendedGear?: string | null;
    };

    if (!body.name || !body.customClassId || !body.level) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const id = await createCustomBuild({
      name: body.name,
      customClassId: body.customClassId,
      level: body.level,
      lookThePart: Boolean(body.lookThePart),
      playStyle: body.playStyle,
      priority: body.priority,
      synergy: body.synergy,
      enemies: body.enemies,
      recommendedGear: body.recommendedGear,
    });

    return NextResponse.json({ id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create build";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
