import {
  decodeSearchCursor,
  encodeSearchCursor,
  mapSearchRpcRow,
  parseSearchLimit,
  parseSearchQuery,
  searchCursorFromItem,
  type SearchEntityType,
  type SearchPage,
  type SearchRpcRow,
  SEARCH_DEFAULT_LIMIT,
} from "@/lib/search";
import { getDisplayNamesForOwnerIds } from "@/lib/queries/publicProfiles";
import { createClient } from "@/lib/server/supabaseServer";

export async function getSearchPage(options: {
  q?: string | null;
  types?: SearchEntityType[] | null;
  cursor?: string | null;
  limit?: number;
}): Promise<SearchPage> {
  const query = parseSearchQuery(options.q);

  const limit = options.limit ?? SEARCH_DEFAULT_LIMIT;
  const parsedLimit = parseSearchLimit(String(limit));
  const decodedCursor = decodeSearchCursor(options.cursor);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_global", {
    p_query: query,
    p_types: options.types && options.types.length > 0 ? options.types : null,
    p_cursor_rank: decodedCursor?.rank ?? null,
    p_cursor_type: decodedCursor?.entityType ?? null,
    p_cursor_id: decodedCursor?.entityId ?? null,
    p_cursor_uuid: decodedCursor?.entityUuid ?? null,
    p_limit: parsedLimit,
  });

  if (error) throw error;

  const rows = (data ?? []) as SearchRpcRow[];
  const items = rows.map(mapSearchRpcRow).filter((item): item is NonNullable<typeof item> => item != null);

  const ownerIds = items
    .filter((item) => item.entityType !== "profile")
    .map((item) => item.ownerId);
  const creatorByOwnerId = await getDisplayNamesForOwnerIds(ownerIds);

  for (const item of items) {
    if (item.entityType === "profile") continue;
    if (item.ownerId) {
      item.creatorDisplayName = creatorByOwnerId.get(item.ownerId) ?? "Player";
    }
  }

  const nextCursor =
    items.length > 0 && items.length >= parsedLimit
      ? encodeSearchCursor(searchCursorFromItem(items[items.length - 1]))
      : null;

  return { items, nextCursor };
}
