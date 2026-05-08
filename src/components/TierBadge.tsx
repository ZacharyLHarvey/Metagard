import type { TierLabel } from "@/lib/tier";

const STYLES: Record<TierLabel, string> = {
  "S+": "bg-fuchsia-600 text-white",
  S: "bg-purple-600 text-white",
  A: "bg-emerald-600 text-white",
  B: "bg-blue-600 text-white",
  C: "bg-amber-600 text-black",
  D: "bg-orange-700 text-white",
  F: "bg-rose-700 text-white",
};

export default function TierBadge({ tier }: { tier: TierLabel }) {
  return <span className={`px-2.5 py-1 rounded-md text-sm font-semibold leading-none ${STYLES[tier]}`}>{tier}</span>;
}

