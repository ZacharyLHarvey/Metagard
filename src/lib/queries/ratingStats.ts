import "server-only";
import { createClient } from "@/lib/server/supabaseServer";
import { BAYESIAN_SMOOTHING_M } from "@/lib/tier";

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export async function getGlobalAverageRating(ratingTable: string): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase.from(ratingTable).select("rating");
  const ratings = (data ?? [])
    .map((r) => toNumberOrNull((r as Record<string, unknown>).rating))
    .filter((n): n is number => n !== null);
  if (ratings.length === 0) return 3;
  const rawGlobal = ratings.reduce((a, b) => a + b, 0) / ratings.length;
  const n = ratings.length;
  const m = BAYESIAN_SMOOTHING_M;
  const neutralPrior = 3;
  // Smooth the global prior itself so one or two votes can't force C to extremes.
  return (n / (n + m)) * rawGlobal + (m / (n + m)) * neutralPrior;
}

export async function getNumericEntityVoteStats(
  ratingTable: string,
  idColumn: string,
  ids: number[]
): Promise<Map<number, { votes: number; rawAverage: number }>> {
  const supabase = await createClient();
  if (ids.length === 0) return new Map();
  const wanted = new Set(ids);
  const { data, error } = await supabase.from(ratingTable).select("*");
  if (error) return new Map();
  const stats = new Map<number, { total: number; votes: number }>();
  for (const row of ((data ?? []) as unknown as Array<Record<string, unknown>>)) {
    const id = toNumberOrNull(row[idColumn]);
    const rating = toNumberOrNull(row.rating);
    if (id == null || rating == null || !wanted.has(id)) continue;
    const curr = stats.get(id) ?? { total: 0, votes: 0 };
    curr.total += rating;
    curr.votes += 1;
    stats.set(id, curr);
  }
  return new Map(
    [...stats.entries()].map(([id, s]) => [id, { votes: s.votes, rawAverage: s.votes > 0 ? s.total / s.votes : 0 }])
  );
}

export async function getStringEntityVoteStats(
  ratingTable: string,
  keyColumn: string,
  keys: string[]
): Promise<Map<string, { votes: number; rawAverage: number }>> {
  const supabase = await createClient();
  if (keys.length === 0) return new Map();
  const wanted = new Set(keys);
  const { data, error } = await supabase.from(ratingTable).select("*");
  if (error) return new Map();
  const stats = new Map<string, { total: number; votes: number }>();
  for (const row of ((data ?? []) as unknown as Array<Record<string, unknown>>)) {
    const key = typeof row[keyColumn] === "string" ? row[keyColumn] : null;
    const rating = toNumberOrNull(row.rating);
    if (!key || rating == null || !wanted.has(key)) continue;
    const curr = stats.get(key) ?? { total: 0, votes: 0 };
    curr.total += rating;
    curr.votes += 1;
    stats.set(key, curr);
  }
  return new Map(
    [...stats.entries()].map(([key, s]) => [key, { votes: s.votes, rawAverage: s.votes > 0 ? s.total / s.votes : 0 }])
  );
}

