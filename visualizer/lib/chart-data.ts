import { EFFORT_ORDER, effortRank, paretoFrontier } from "./insights";
import {
  applyFilters,
  type Filters,
  type LeaderboardVariant,
} from "./leaderboard";

export type ChartVariant = Omit<LeaderboardVariant, "bySize"> & {
  displayName: string;
  familyDisplayName: string;
  overallCorrect: number;
  bySize: (LeaderboardVariant["bySize"][number] & {
    correct: number;
    totalDurationMs: number;
    totalTokens: number;
  })[];
};

export type XMetric = "cost" | "time" | "tokens";

export function chartStats(model: ChartVariant, size?: string) {
  const entries = model.bySize.filter((entry) =>
    size ? entry.size === size : ["5x5", "10x10", "15x15"].includes(entry.size),
  );
  const runs = size ? (entries[0]?.runs ?? 0) : model.overallRuns;
  return {
    accuracy: size ? (entries[0]?.accuracy ?? 0) : model.overallAccuracy,
    correct: size ? (entries[0]?.correct ?? 0) : model.overallCorrect,
    runs,
    cost: entries.reduce((sum, entry) => sum + entry.totalCost, 0),
    time: entries.reduce((sum, entry) => sum + entry.totalDurationMs, 0),
    tokens: entries.reduce((sum, entry) => sum + entry.totalTokens, 0),
  };
}

export function scatterPoints<T extends ChartVariant>(
  models: T[],
  size: string | undefined,
  metric: XMetric,
) {
  return models.flatMap((model) => {
    const stats = chartStats(model, size);
    const x = stats.runs ? stats[metric] / stats.runs : 0;
    return Number.isFinite(x) && x > 0
      ? [{ id: model.model, model, x, y: stats.accuracy, stats }]
      : [];
  });
}

export function scatterFrontier<T extends ChartVariant>(
  models: T[],
  size: string | undefined,
  metric: XMetric,
) {
  return paretoFrontier(scatterPoints(models, size, metric));
}

export function effortLadders<T extends ChartVariant>(
  models: T[],
  filters: Filters,
) {
  const all = applyFilters(models, { ...filters, effort: "all" });
  const groups = new Map<string, T[]>();
  for (const model of all)
    groups.set(model.family, [...(groups.get(model.family) ?? []), model]);
  return [...groups.values()]
    .map((variants) =>
      variants.sort(
        (a, b) =>
          effortRank(a.effort) - effortRank(b.effort) ||
          a.effort.localeCompare(b.effort),
      ),
    )
    .filter(
      (variants) => new Set(variants.map((model) => model.effort)).size >= 2,
    )
    .sort((a, b) =>
      a[0].familyDisplayName.localeCompare(b[0].familyDisplayName),
    );
}

export function effortInsight<T extends ChartVariant>(
  ladders: T[][],
  size?: string,
) {
  const comparable = ladders.some((ladder) =>
    ladder
      .slice(1)
      .some(
        (model, index) =>
          effortRank(model.effort) < EFFORT_ORDER.length &&
          effortRank(ladder[index].effort) < EFFORT_ORDER.length,
      ),
  );
  const dips = ladders.flatMap((ladder) =>
    ladder.slice(1).flatMap((model, index) => {
      const prior = ladder[index];
      if (
        effortRank(model.effort) >= EFFORT_ORDER.length ||
        effortRank(prior.effort) >= EFFORT_ORDER.length
      )
        return [];
      const change =
        chartStats(model, size).accuracy - chartStats(prior, size).accuracy;
      return change < -0.05
        ? [
            {
              name: model.familyDisplayName,
              from: prior.effort,
              to: model.effort,
            },
          ]
        : [];
    }),
  );
  if (dips.length) {
    const names = [...new Set(dips.map((dip) => dip.name))];
    const examples =
      names.length > 2
        ? `${names[0]}, ${names[1]}, and ${names.length - 2} more families`
        : names.join(" and ");
    return `A higher effort level scored lower for ${examples} in this selection.`;
  }
  return comparable
    ? "Every adjacent effort level held steady or improved in this selection."
    : ladders.length
      ? "The selected families have no pairs of ordered effort levels to compare."
      : "Select families with at least two measured effort levels to compare them.";
}
