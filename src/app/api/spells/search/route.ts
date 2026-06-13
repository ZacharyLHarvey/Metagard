import { NextResponse } from "next/server";
import { searchCanonicalSpells, searchCustomSpells } from "@/lib/queries/customClassSpellbook";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const limit = Math.min(Number(searchParams.get("limit") ?? 20), 50);
  const scope = searchParams.get("scope") ?? "all";

  try {
    const [canonical, custom] = await Promise.all([
      scope === "custom" ? Promise.resolve([]) : searchCanonicalSpells(q, limit),
      scope === "canonical" ? Promise.resolve([]) : searchCustomSpells(q, limit),
    ]);
    const items = [...canonical, ...custom].slice(0, limit);
    return NextResponse.json({ items });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
