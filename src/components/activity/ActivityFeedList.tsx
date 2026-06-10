"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ActivityFeedItemRow from "@/components/activity/ActivityFeedItem";
import type { ActivityFeedFilter, ActivityFeedItem } from "@/lib/activityFeed";

type Props = {
  feed: ActivityFeedFilter;
  initialItems: ActivityFeedItem[];
  initialCursor: string | null;
};

export default function ActivityFeedList({ feed, initialItems, initialCursor }: Props) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(initialCursor == null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(async () => {
    if (loading || done || !cursor) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ feed, cursor, limit: "20" });
      const response = await fetch(`/api/activity-feed?${params.toString()}`);
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to load more activity");
      }
      const body = (await response.json()) as {
        items: ActivityFeedItem[];
        nextCursor: string | null;
      };
      setItems((prev) => [...prev, ...body.items]);
      setCursor(body.nextCursor);
      if (!body.nextCursor || body.items.length === 0) setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load more activity");
    } finally {
      setLoading(false);
    }
  }, [cursor, done, feed, loading]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || done || !cursor) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadMore();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [cursor, done, loadMore]);

  if (items.length === 0) {
    return (
      <div className="border border-neutral-800 rounded-lg px-4 py-8 text-center text-neutral-500">
        Nothing here yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ul className="border border-neutral-800 rounded-lg divide-y divide-neutral-800">
        {items.map((item) => (
          <ActivityFeedItemRow key={`${item.entityType}-${item.entityId}`} item={item} />
        ))}
      </ul>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {loading ? <p className="text-sm text-neutral-400 text-center">Loading more…</p> : null}
      {!loading && done && items.length > 0 ? (
        <p className="text-sm text-neutral-500 text-center">No more activity.</p>
      ) : null}
      {!done && cursor ? <div ref={sentinelRef} className="h-8" aria-hidden /> : null}
    </div>
  );
}
