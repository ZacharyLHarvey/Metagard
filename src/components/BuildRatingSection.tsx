"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  buildId: number;
  canRate: boolean;
  initialMyRating: number | null;
  ratingApiUrl?: string;
};

export default function BuildRatingSection({
  buildId,
  canRate,
  initialMyRating,
  ratingApiUrl,
}: Props) {
  const router = useRouter();
  const [myRating, setMyRating] = useState<number | null>(initialMyRating);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const resolvedRatingUrl = ratingApiUrl ?? `/api/builds/${buildId}/rating`;

  async function choose(stars: number) {
    if (!canRate) return;
    setBusy(true);
    setError("");
    const res = await fetch(resolvedRatingUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating: stars }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Could not save rating");
      return;
    }
    setMyRating(stars);
    router.refresh();
  }

  if (!canRate) {
    return (
      <p className="text-sm text-neutral-500">
        <a href="/login" className="text-blue-400 underline">
          Sign in
        </a>{" "}
        to rate this build (once per account).
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-neutral-400">
        Your rating (1–5). One row per account; you may update your stars anytime.
      </p>
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            disabled={busy}
            onClick={() => choose(n)}
            className={`px-3 py-1 rounded text-sm ${
              myRating === n ? "bg-amber-600 text-white" : "bg-neutral-800 border border-neutral-600 hover:bg-neutral-700"
            }`}
          >
            {n} ★
          </button>
        ))}
      </div>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  );
}
