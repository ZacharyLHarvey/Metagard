import { NextResponse } from "next/server";
import { createClient } from "@/lib/server/supabaseServer";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("custom_classes")
    .select("*")
    .order("average_rating", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await request.json()) as { name?: string; description?: string | null };
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

    const { data, error } = await supabase
      .from("custom_classes")
      .insert({ owner_id: user.id, name, description: body.description ?? null })
      .select("id")
      .single();
    if (error) throw error;
    return NextResponse.json({ id: data.id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
