import { NextResponse } from "next/server";
import { toggleSavedCustomBuild } from "@/lib/queries/customBuildSocial";

type Params = { params: Promise<{ id: string }> };

export async function POST(_: Request, context: Params) {
  try {
    const { id } = await context.params;
    const result = await toggleSavedCustomBuild(Number(id));
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to toggle save";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
