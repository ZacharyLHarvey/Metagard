import { NextResponse } from "next/server";
import { createClient } from "@/lib/server/supabaseServer";

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await request.json()) as {
      favorite_class?: string | null;
      favorite_battle_game?: string | null;
      favorite_spell?: string | null;
    };

    const patch: Record<string, unknown> = {};
    if ("favorite_class" in body) {
      patch.favorite_class =
        typeof body.favorite_class === "string" ? body.favorite_class.trim() || null : null;
    }
    if ("favorite_battle_game" in body) {
      patch.favorite_battle_game =
        typeof body.favorite_battle_game === "string"
          ? body.favorite_battle_game.trim() || null
          : null;
    }
    if ("favorite_spell" in body) {
      patch.favorite_spell =
        typeof body.favorite_spell === "string" ? body.favorite_spell.trim() || null : null;
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "No valid fields" }, { status: 400 });
    }

    const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : typeof e === "object" && e && "message" in e && typeof (e as { message?: unknown }).message === "string"
          ? String((e as { message: string }).message)
          : "Failed to update profile";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
