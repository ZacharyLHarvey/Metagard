import { NextResponse } from "next/server";
import { createClient } from "@/lib/server/supabaseServer";

const DEFAULT_COUNT = 1;
const MAX_COUNT = 500;

type SpellPickRow = {
  id: number;
  name: string;
  type: string | null;
};

function parseCount(raw: string | null): number {
  if (raw == null || raw.trim() === "") return DEFAULT_COUNT;
  const n = Number(raw.trim());
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) return DEFAULT_COUNT;
  return Math.min(n, MAX_COUNT);
}

function pickWithReplacement(pool: SpellPickRow[], count: number): SpellPickRow[] {
  if (pool.length === 0) return [];
  const out: SpellPickRow[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push(pool[Math.floor(Math.random() * pool.length)]!);
  }
  return out;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const count = parseCount(url.searchParams.get("count"));
    const typeParams = url.searchParams.getAll("type");
    const types = [...new Set(typeParams.map((s) => s.trim()).filter((s) => s !== ""))];

    const supabase = await createClient();
    let query = supabase.from("spells").select("id,name,type");
    if (types.length > 0) query = query.in("type", types);

    const { data, error } = await query;
    if (error) throw error;

    const pool = (data ?? []) as SpellPickRow[];
    const poolSize = pool.length;
    const spells = pickWithReplacement(pool, count);

    return NextResponse.json({ spells, poolSize });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to pick random spells";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
