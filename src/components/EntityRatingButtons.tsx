"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  postUrl: string;
  canRate: boolean;
  initialMyRating: number | null;
};

export default function EntityRatingButtons({ postUrl, canRate, initialMyRating }: Props) {
  const router = useRouter();
  const [myRating, setMyRating] = useState<number | null>(initialMyRating);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function choose(stars: number) {
    if (!canRate) return;
    setBusy(true);
    setError("");
    const res = await fetch(postUrl, {
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
        to rate (once per account).
      </p>
    );
  }

  return (
    <div className="space-y-2">
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
