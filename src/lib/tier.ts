import "server-only";

export const BAYESIAN_SMOOTHING_M = 10;

export type TierLabel = "S+" | "S" | "A" | "B" | "C" | "D" | "F";

export type TierResult = {
  weightedRating: number;
  tier: TierLabel;
  tierRank: number;
};

export function toTier(weightedRating: number): TierLabel {
  if (weightedRating >= 4.9) return "S+";
  if (weightedRating >= 4.7) return "S";
  if (weightedRating >= 4.1) return "A";
  if (weightedRating >= 3.4) return "B";
  if (weightedRating >= 2.6) return "C";
  if (weightedRating >= 1.8) return "D";
  return "F";
}

export function tierRank(tier: TierLabel): number {
  const order: TierLabel[] = ["S+", "S", "A", "B", "C", "D", "F"];
  return order.indexOf(tier);
}

export function computeWeightedRating(rawAverage: number, votes: number, globalAverage: number): number {
  const v = Number.isFinite(votes) && votes > 0 ? votes : 0;
  const x = Number.isFinite(rawAverage) ? rawAverage : 0;
  // Sensible default if there are no ratings yet in a domain.
  const c = Number.isFinite(globalAverage) && globalAverage > 0 ? globalAverage : 3;
  const m = BAYESIAN_SMOOTHING_M;
  return (v / (v + m)) * x + (m / (v + m)) * c;
}

export function computeTierResult(rawAverage: number, votes: number, globalAverage: number): TierResult {
  const weightedRating = computeWeightedRating(rawAverage, votes, globalAverage);
  const tier = toTier(weightedRating);
  return { weightedRating, tier, tierRank: tierRank(tier) };
}

