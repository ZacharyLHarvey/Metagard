import { NextResponse } from "next/server";
import { parseBuildEditDefaults, parseBuildViewDefaults } from "@/lib/spellbook/buildDisplayDefaults";
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
      theme_preference?: string | null;
      spellbook_tips_enabled?: boolean | null;
      build_view_defaults?: Record<string, unknown> | null;
      build_edit_defaults?: Record<string, unknown> | null;
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
    if ("theme_preference" in body) {
      patch.theme_preference = body.theme_preference === "light" ? "light" : "dark";
    }
    if ("spellbook_tips_enabled" in body && typeof body.spellbook_tips_enabled === "boolean") {
      patch.spellbook_tips_enabled = body.spellbook_tips_enabled;
    }
    if ("build_view_defaults" in body && body.build_view_defaults != null) {
      patch.build_view_defaults = parseBuildViewDefaults(body.build_view_defaults);
    }
    if ("build_edit_defaults" in body && body.build_edit_defaults != null) {
      patch.build_edit_defaults = parseBuildEditDefaults(body.build_edit_defaults);
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
