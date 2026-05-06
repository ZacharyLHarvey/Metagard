import { NextResponse } from "next/server";
import { createClient } from "@/lib/server/supabaseServer";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Params) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    const entityId = Number(id);
    const body = (await request.json()) as { rating?: number };
    const rating = body.rating;
    if (typeof rating !== "number" || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return NextResponse.json({ error: "rating must be integer 1–5" }, { status: 400 });
    }

    const { error } = await supabase.from("custom_spell_ratings").upsert(
      { user_id: user.id, custom_spell_id: entityId, rating },
      { onConflict: "user_id,custom_spell_id" }
    );
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
