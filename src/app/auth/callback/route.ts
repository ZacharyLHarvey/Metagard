import { createClient } from "@/lib/server/supabaseServer";
import { NextResponse } from "next/server";

function displayNameFromUserMetadata(meta: Record<string, unknown> | undefined): string {
  const pick = (k: string) => {
    const v = meta?.[k];
    return typeof v === "string" ? v.trim() : "";
  };
  return (
    pick("display_name") ||
    pick("full_name") ||
    pick("name") ||
    "Player"
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const next = searchParams.get("next");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(request.url);

  if (!error && data.user) {
    const meta = data.user.user_metadata as Record<string, unknown> | undefined;
    const displayName = displayNameFromUserMetadata(meta);
    await supabase.from("profiles").upsert(
      { id: data.user.id, display_name: displayName },
      { onConflict: "id" }
    );
  }

  if (error) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : null;
  const destination = safeNext ?? "/login?confirmed=1";
  return NextResponse.redirect(new URL(destination, request.url));
}
