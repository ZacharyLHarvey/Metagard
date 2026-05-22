/** Coerce build/group ids from JSON or PostgREST (bigint often arrives as string). */
export function normalizePositiveIntId(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isInteger(n) && n > 0) return n;
  }
  return null;
}

export function normalizeBuildIdsFromBody(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  const ids: number[] = [];
  for (const item of raw) {
    const id = normalizePositiveIntId(item);
    if (id != null) ids.push(id);
  }
  return [...new Set(ids)];
}
