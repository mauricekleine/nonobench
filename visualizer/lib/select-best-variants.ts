type Variant = {
  model: string;
  family: string;
  effort: string;
  overallAccuracy: number;
  overallRuns: number;
  overallTotal?: number;
  complete?: boolean;
  bySize: { size: string; totalCost: number }[];
};

// Headline figures cover the core tier only; extended sizes (20x20) must not
// skew cost comparisons between variants.
const CORE_SIZES = new Set(["5x5", "10x10", "15x15"]);

const effortOrder: Record<string, number> = {
  none: 0,
  minimal: 1,
  low: 2,
  medium: 3,
  high: 4,
  xhigh: 5,
  max: 6,
  // An unspecified provider default has no known level, so explicit levels win a tie.
  default: 7,
};

function averageCost(model: Variant): number {
  const totalCost = model.bySize
    .filter((size) => CORE_SIZES.has(size.size))
    .reduce((sum, size) => sum + size.totalCost, 0);
  return model.overallRuns > 0 ? totalCost / model.overallRuns : 0;
}

// Timeouts are finished attempts that count as unsolved, so a variant with
// one for every missing success has finished even though it isn't `complete`.
function isFinished(model: Variant): boolean {
  if (model.complete !== false) return true;
  return model.overallTotal !== undefined && model.overallRuns >= model.overallTotal;
}

function isBetter(candidate: Variant, current: Variant): boolean {
  // A finished variant always beats one still running: a few early (mostly
  // 5x5) results would otherwise inflate its accuracy.
  if (isFinished(candidate) !== isFinished(current)) return isFinished(candidate);
  if (candidate.overallAccuracy !== current.overallAccuracy) {
    return candidate.overallAccuracy > current.overallAccuracy;
  }
  const costDifference = averageCost(candidate) - averageCost(current);
  if (costDifference !== 0) return costDifference < 0;
  const effortDifference =
    (effortOrder[candidate.effort] ?? Infinity) - (effortOrder[current.effort] ?? Infinity);
  if (effortDifference !== 0) return effortDifference < 0;
  return candidate.model.localeCompare(current.model) < 0;
}

// Pass only variants allowed by the reasoning filters. The selected model is
// independent of the chart's size filter because accuracy is always overall.
export function selectBestVariants<T extends Variant>(models: T[]): T[] {
  const bestByFamily = new Map<string, T>();
  for (const model of models) {
    const current = bestByFamily.get(model.family);
    if (!current || isBetter(model, current)) bestByFamily.set(model.family, model);
  }
  return [...bestByFamily.values()];
}
