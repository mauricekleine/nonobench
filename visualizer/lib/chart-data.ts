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

export function decadeTicks(lower: number, upper: number): number[] {
  if (
    !Number.isFinite(lower) ||
    !Number.isFinite(upper) ||
    !(lower > 0) ||
    !(upper >= lower)
  )
    return [];
  const ticks: number[] = [];
  for (
    let power = Math.ceil(Math.log10(lower));
    power <= Math.floor(Math.log10(upper));
    power++
  ) {
    ticks.push(10 ** power);
  }
  return ticks;
}

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

export type EffortGroup<T extends ChartVariant> = {
  kind: "ordered" | "reasoning";
  variants: T[];
};

export function effortLadders<T extends ChartVariant>(
  models: T[],
  filters: Filters,
): EffortGroup<T>[] {
  const all = applyFilters(models, { ...filters, effort: "all" });
  const groups = new Map<string, T[]>();
  for (const model of all)
    groups.set(model.family, [...(groups.get(model.family) ?? []), model]);
  return [...groups.values()]
    .flatMap((variants): EffortGroup<T>[] => {
      const ordered = variants
        .filter((model) => effortRank(model.effort) < EFFORT_ORDER.length)
        .sort((a, b) => effortRank(a.effort) - effortRank(b.effort));
      if (new Set(ordered.map((model) => model.effort)).size >= 2)
        return [{ kind: "ordered", variants: ordered }];
      const off = variants.find((model) => model.effort === "none");
      const on = variants.find((model) => model.effort === "default");
      return off && on ? [{ kind: "reasoning", variants: [off, on] }] : [];
    })
    .sort((a, b) => {
      const change = (group: EffortGroup<T>) => {
        const first = chartStats(group.variants[0], filters.size).accuracy;
        const last = chartStats(
          group.variants[group.variants.length - 1],
          filters.size,
        ).accuracy;
        return Math.abs(last - first);
      };
      const best = (group: EffortGroup<T>) =>
        Math.max(
          ...group.variants.map(
            (model) => chartStats(model, filters.size).accuracy,
          ),
        );
      return (
        (Math.abs(change(b) - change(a)) >= 0.05 ? change(b) - change(a) : 0) ||
        best(b) - best(a) ||
        a.variants[0].familyDisplayName.localeCompare(
          b.variants[0].familyDisplayName,
        )
      );
    });
}

export function effortRowDomain<T extends ChartVariant>(
  group: EffortGroup<T>,
  size?: string,
) {
  const scores = group.variants.map(
    (model) => chartStats(model, size).accuracy,
  );
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const padding = Math.max(5, (max - min) * 0.2);
  return {
    low: Math.max(0, min - padding),
    high: Math.min(100, max + padding),
  };
}

export function effortInsight<T extends ChartVariant>(
  ladders: EffortGroup<T>[],
  size?: string,
) {
  const ordered = ladders.filter((group) => group.kind === "ordered");
  const gains = ordered
    .flatMap((group) => {
      const first = group.variants[0];
      const last = group.variants[group.variants.length - 1];
      const start = chartStats(first, size);
      const end = chartStats(last, size);
      return end.accuracy > start.accuracy + 0.05
        ? [{ first, last, start, end, change: end.accuracy - start.accuracy }]
        : [];
    })
    .sort(
      (a, b) =>
        (Math.abs(b.change - a.change) >= 0.05 ? b.change - a.change : 0) ||
        b.end.accuracy - a.end.accuracy,
    );
  const gain = gains[0];
  const findings: string[] = [];
  if (gain) {
    const amount =
      gain.start.runs === gain.end.runs && gain.start.runs > 0
        ? `${gain.end.correct - gain.start.correct} more puzzles`
        : `${gain.change.toFixed(1)} percentage points higher`;
    findings.push(
      `${gain.first.familyDisplayName} scored ${amount} at ${gain.last.effort} than at ${gain.first.effort}.`,
    );
  }

  const dips = ordered
    .flatMap((group) =>
      group.variants.slice(1).flatMap((model, index) => {
        const prior = group.variants[index];
        const change =
          chartStats(model, size).accuracy - chartStats(prior, size).accuracy;
        return change < -0.05
          ? [
              {
                name: model.familyDisplayName,
                from: prior.effort,
                to: model.effort,
                change,
              },
            ]
          : [];
      }),
    )
    .sort(
      (a, b) =>
        Number(b.from === "low" && b.to === "medium") -
          Number(a.from === "low" && a.to === "medium") ||
        (Math.abs(a.change - b.change) >= 0.05 ? a.change - b.change : 0) ||
        a.name.localeCompare(b.name),
    );
  if (dips.length) {
    const lead = dips[0];
    const paired = dips.find(
      (dip) =>
        dip.name !== lead.name && dip.from === lead.from && dip.to === lead.to,
    );
    findings.push(
      `${lead.name}${paired ? ` and ${paired.name}` : ""} scored lower at ${lead.to} than at ${lead.from}.`,
    );
  }
  if (findings.length) return findings.join(" ");
  if (ordered.length)
    return "Scores held steady across the ordered effort levels in this selection.";
  if (ladders.length) {
    const group = ladders[0];
    const off = chartStats(group.variants[0], size);
    const on = chartStats(group.variants[1], size);
    const difference = on.correct - off.correct;
    if (off.runs === on.runs && off.runs > 0) {
      if (difference > 0)
        return `${group.variants[0].familyDisplayName} solved ${difference} more puzzles with reasoning on than off.`;
      if (difference < 0)
        return `${group.variants[0].familyDisplayName} solved ${-difference} fewer puzzles with reasoning on than off.`;
      return `${group.variants[0].familyDisplayName} solved the same number of puzzles with reasoning off and on.`;
    }
    return `Compare reasoning off and on below; the provider's default reasoning level is unknown.`;
  }
  return "Select families with at least two measured effort levels to compare them.";
}
