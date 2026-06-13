import { NextResponse } from "next/server";
import {
  getCustomClassById,
  getCustomClassRules,
  updateCustomClassWithRules,
} from "@/lib/queries/customClassSpellbook";
import { parseCustomClassPayload } from "@/lib/customClass/parsePayload";
import { createClient } from "@/lib/server/supabaseServer";

type Params = { params: Promise<{ id: string }> };

function parsePayload(body: Record<string, unknown>) {
  return parseCustomClassPayload(body);
}

export async function GET(request: Request, context: Params) {
  const { id } = await context.params;
  const classId = Number(id);
  const { searchParams } = new URL(request.url);
  const includeRules = searchParams.get("include") === "rules";

  const row = await getCustomClassById(classId);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const rules = includeRules ? await getCustomClassRules(classId) : undefined;
  return NextResponse.json({ item: row, rules });
}

export async function PATCH(request: Request, context: Params) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    const classId = Number(id);
    const body = (await request.json()) as Record<string, unknown>;
    const payload = parsePayload(body);
    await updateCustomClassWithRules(user.id, classId, payload);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
