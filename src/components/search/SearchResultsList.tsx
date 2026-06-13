"use client";

import { useCallback, useState } from "react";
import SearchResultRow from "@/components/search/SearchResultRow";
import type { SearchFilter, SearchResultItem } from "@/lib/search";

type Props = {
  query: string;
  typeFilter: SearchFilter;
  initialItems: SearchResultItem[];
  initialCursor: string | null;
};

export default function SearchResultsList({
  query,
  typeFilter,
  initialItems,
  initialCursor,
}: Props) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(initialCursor == null);

  const loadMore = useCallback(async () => {
    if (loading || done || !cursor) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ q: query, cursor, limit: "20" });
      if (typeFilter !== "all") params.set("type", typeFilter);
      const response = await fetch(`/api/search?${params.toString()}`);
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to load more results");
      }
      const body = (await response.json()) as {
        items: SearchResultItem[];
        nextCursor: string | null;
      };
      setItems((prev) => [...prev, ...body.items]);
      setCursor(body.nextCursor);
      if (!body.nextCursor || body.items.length === 0) setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load more results");
    } finally {
      setLoading(false);
    }
  }, [cursor, done, loading, query, typeFilter]);

  if (items.length === 0) {
    return (
      <div className="border border-neutral-800 rounded-lg px-4 py-8 text-center text-neutral-500">
        No results for &ldquo;{query}&rdquo;.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ul className="border border-neutral-800 rounded-lg divide-y divide-neutral-800">
        {items.map((item) => (
          <SearchResultRow
            key={`${item.entityType}-${item.entityId}-${item.entityUuid ?? "x"}`}
            item={item}
          />
        ))}
      </ul>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {!done && cursor ? (
        <div className="text-center">
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={loading}
            className="px-4 py-2 rounded bg-neutral-800 hover:bg-neutral-700 text-sm disabled:opacity-50"
          >
            {loading ? "Loading…" : "Load more"}
          </button>
        </div>
      ) : null}
      {!loading && done && items.length > 0 ? (
        <p className="text-sm text-neutral-500 text-center">End of results.</p>
      ) : null}
    </div>
  );
}
