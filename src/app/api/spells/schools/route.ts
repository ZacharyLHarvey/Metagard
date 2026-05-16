import { NextResponse } from "next/server";
import { createClient } from "@/lib/server/supabaseServer";

type SchoolRow = { school: string | null };

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("spells").select("school");
    if (error) throw error;

    const distinct = new Set<string>();
    for (const row of (data ?? []) as SchoolRow[]) {
      const s = row.school;
      if (s == null) continue;
      const t = String(s).trim();
      if (t !== "") distinct.add(t);
    }

    const schools = [...distinct].sort((a, b) => a.localeCompare(b));
    return NextResponse.json({ schools });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load spell schools";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
