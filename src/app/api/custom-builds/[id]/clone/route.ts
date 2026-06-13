import { NextResponse } from "next/server";
import { cloneCustomBuild } from "@/lib/queries/customBuildSocial";

type Params = { params: Promise<{ id: string }> };

export async function POST(_: Request, context: Params) {
  try {
    const { id } = await context.params;
    const newId = await cloneCustomBuild(Number(id));
    return NextResponse.json({ id: newId });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Clone failed";
    const status = message === "Unauthorized" ? 401 : message === "Not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
