import { NextResponse } from "next/server";
import { updateBuildSideboard } from "@/lib/queries/spellbook";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, context: Params) {
  try {
    const { id } = await context.params;
    const buildId = Number(id);
    const body = (await request.json()) as { spellIds?: unknown };

    const raw = body.spellIds;
    const spellIds = Array.isArray(raw)
      ? raw.map((x) => (typeof x === "number" ? x : Number(x))).filter((n) => Number.isFinite(n))
      : [];

    await updateBuildSideboard(buildId, spellIds);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update sideboard";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : message.includes("caster") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
