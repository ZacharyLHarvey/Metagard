import { NextResponse } from "next/server";
import { getCatalogClasses } from "@/lib/queries/spellbook";

export async function GET() {
  try {
    const classes = await getCatalogClasses();
    const names = classes.map((c) => c.name).sort((a, b) => a.localeCompare(b));
    return NextResponse.json({ classes: names });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load class filter options";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
