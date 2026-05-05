import { NextResponse } from "next/server";
import { toggleSavedBuild } from "@/lib/queries/spellbook";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(_: Request, context: Params) {
  try {
    const { id } = await context.params;
    const result = await toggleSavedBuild(Number(id));
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to toggle save";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
