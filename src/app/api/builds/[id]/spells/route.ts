import { NextResponse } from "next/server";
import { upsertBuildSpellSelections } from "@/lib/queries/spellbook";
import type { BuildSpellSelectionInput } from "@/lib/spellbook/types";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, context: Params) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      selections?: BuildSpellSelectionInput[];
    };
    await upsertBuildSpellSelections(Number(id), body.selections ?? []);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save spells";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
