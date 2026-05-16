import { NextResponse } from "next/server";
import { createClient } from "@/lib/server/supabaseServer";

type TypeRow = { type: string | null };

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("spells").select("type");
    if (error) throw error;

    const distinct = new Set<string>();
    for (const row of (data ?? []) as TypeRow[]) {
      const t = row.type;
      if (t == null) continue;
      const trimmed = String(t).trim();
      if (trimmed !== "") distinct.add(trimmed);
    }

    const types = [...distinct].sort((a, b) => a.localeCompare(b));
    return NextResponse.json({ types });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load spell types";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
