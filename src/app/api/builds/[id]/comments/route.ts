import { NextResponse } from "next/server";
import { createClient } from "@/lib/server/supabaseServer";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, context: Params) {
  const { id } = await context.params;
  const buildId = Number(id);
  const { getBuildCommentsWithAuthors } = await import("@/lib/queries/social");
  const rows = await getBuildCommentsWithAuthors(buildId);
  return NextResponse.json({ comments: rows });
}

export async function POST(request: Request, context: Params) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    const buildId = Number(id);
    const body = (await request.json()) as { body?: string };
    const text = typeof body.body === "string" ? body.body.trim() : "";
    if (!text) return NextResponse.json({ error: "body required" }, { status: 400 });

    const { error } = await supabase.from("build_comments").insert({
      build_id: buildId,
      user_id: user.id,
      body: text,
    });
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to post comment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
