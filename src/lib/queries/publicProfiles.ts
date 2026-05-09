import "server-only";

import { createClient } from "@/lib/server/supabaseServer";

/** Loose UUID v4 check for route params (profiles.id is uuid). */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isProfileUserIdParam(id: string): boolean {
  return UUID_RE.test(id.trim());
}

export async function getProfileRowByUserId(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error || !data) return null;
  return data;
}

export function displayNameFromProfileRow(row: { display_name?: string | null } | null): string {
  const n = row?.display_name?.trim();
  return n && n.length > 0 ? n : "Player";
}

/** Map owner_id → display name for Creator: lines (missing profile → "Player"). */
export async function getDisplayNamesForOwnerIds(
  ownerIds: Array<string | null | undefined>
): Promise<Map<string, string>> {
  const unique = [
    ...new Set(
      ownerIds.filter((x): x is string => typeof x === "string" && x.length > 0)
    ),
  ];
  const map = new Map<string, string>();
  if (unique.length === 0) return map;

  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id, display_name").in("id", unique);
  for (const row of data ?? []) {
    map.set(String(row.id), displayNameFromProfileRow(row));
  }
  for (const id of unique) {
    if (!map.has(id)) map.set(id, "Player");
  }
  return map;
}
