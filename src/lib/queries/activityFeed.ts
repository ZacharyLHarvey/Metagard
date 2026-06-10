import {
  ACTIVITY_FEED_DEFAULT_LIMIT,
  activityFeedFilterToRpc,
  mapActivityFeedRpcRow,
  parseActivityFeedFilter,
  parseActivityFeedLimit,
  type ActivityFeedFilter,
  type ActivityFeedItem,
  type ActivityFeedRpcRow,
} from "@/lib/activityFeed";
import { getDisplayNamesForOwnerIds } from "@/lib/queries/publicProfiles";
import { createClient } from "@/lib/server/supabaseServer";

export type ActivityFeedPage = {
  items: ActivityFeedItem[];
  nextCursor: string | null;
};

export async function getActivityFeedPage(options: {
  feed?: ActivityFeedFilter | string;
  cursor?: string | null;
  limit?: number;
}): Promise<ActivityFeedPage> {
  const filter = parseActivityFeedFilter(
    typeof options.feed === "string" ? options.feed : options.feed ?? "all"
  );
  const limit = options.limit ?? ACTIVITY_FEED_DEFAULT_LIMIT;
  const rpcFilter = activityFeedFilterToRpc(filter);
  const cursor = options.cursor?.trim() || null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_activity_feed", {
    p_filter: rpcFilter,
    p_cursor: cursor,
    p_limit: parseActivityFeedLimit(String(limit)),
  });

  if (error) throw error;

  const rows = (data ?? []) as ActivityFeedRpcRow[];
  const items = rows.map(mapActivityFeedRpcRow).filter((item): item is ActivityFeedItem => item != null);

  const creatorByOwnerId = await getDisplayNamesForOwnerIds(items.map((item) => item.ownerId));
  for (const item of items) {
    if (item.ownerId) {
      item.creatorDisplayName = creatorByOwnerId.get(item.ownerId) ?? "Player";
    }
  }

  const nextCursor =
    items.length > 0 && items.length >= parseActivityFeedLimit(String(limit))
      ? items[items.length - 1].createdAt
      : null;

  return { items, nextCursor };
}
