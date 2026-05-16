"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { EntityCommentRow } from "@/lib/queries/social";

type Props = {
  commentsApiUrl: string;
  canComment: boolean;
};

export default function EntityCommentsSection({ commentsApiUrl, canComment }: Props) {
  const router = useRouter();
  const [comments, setComments] = useState<EntityCommentRow[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const [collapsed, setCollapsed] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(commentsApiUrl);
    const data = (await res.json()) as { comments?: EntityCommentRow[] };
    setComments(data.comments ?? []);
    setLoading(false);
  }, [commentsApiUrl]);

  useEffect(() => {
    void load();
  }, [load]);

  async function post() {
    const text = body.trim();
    if (!text) return;
    setPosting(true);
    setError("");
    const res = await fetch(commentsApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: text }),
    });
    setPosting(false);
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      setError(err.error ?? "Failed to post");
      return;
    }
    setBody("");
    await load();
    router.refresh();
  }

  return (
    <section className="border border-neutral-800 rounded-lg p-3 sm:p-4">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 text-left rounded-md px-1 py-2 -mx-1 hover:bg-neutral-800/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        onClick={() => setCollapsed((c) => !c)}
        aria-expanded={!collapsed}
      >
        <h2 className="text-lg font-semibold">
          Comments
          {!loading && comments.length > 0 ? (
            <span className="ml-2 text-sm font-normal text-neutral-400 tabular-nums">
              ({comments.length})
            </span>
          ) : null}
        </h2>
        <span className="shrink-0 text-neutral-500 text-sm" aria-hidden>
          {collapsed ? "▶" : "▼"}
        </span>
      </button>
      {!collapsed ? (
        <div className="mt-4 space-y-4">
          {loading ? <p className="text-sm text-neutral-500">Loading…</p> : null}
          <ul className="space-y-3">
            {comments.map((c) => (
              <li key={c.id} className="text-sm border-b border-neutral-800/80 pb-2">
                <p className="text-neutral-200">{c.body}</p>
                <p className="text-xs text-neutral-500 mt-1">
                  {c.display_name ?? "Player"} · {new Date(c.created_at).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
          {canComment ? (
            <div className="space-y-2">
              <textarea
                className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-700 min-h-24 text-sm"
                placeholder="Add a comment…"
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
              <button
                type="button"
                disabled={posting || !body.trim()}
                onClick={() => void post()}
                className="px-3 py-1 bg-blue-600 rounded text-sm"
              >
                {posting ? "Posting…" : "Post"}
              </button>
            </div>
          ) : (
            <p className="text-sm text-neutral-500">
              <a href="/login" className="text-blue-400 underline">
                Sign in
              </a>{" "}
              to comment.
            </p>
          )}
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
