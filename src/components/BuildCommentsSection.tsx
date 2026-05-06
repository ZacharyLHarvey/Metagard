"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { BuildCommentRow } from "@/lib/queries/social";

type Props = {
  buildId: number;
  canComment: boolean;
};

export default function BuildCommentsSection({ buildId, canComment }: Props) {
  const router = useRouter();
  const [comments, setComments] = useState<BuildCommentRow[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/builds/${buildId}/comments`);
    const data = (await res.json()) as { comments?: BuildCommentRow[] };
    setComments(data.comments ?? []);
    setLoading(false);
  }, [buildId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function post() {
    const text = body.trim();
    if (!text) return;
    setPosting(true);
    setError("");
    const res = await fetch(`/api/builds/${buildId}/comments`, {
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
    <section className="space-y-4 border border-neutral-800 rounded-lg p-4">
      <h2 className="text-lg font-semibold">Comments</h2>
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
    </section>
  );
}
