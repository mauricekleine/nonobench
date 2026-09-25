import { selectBestVariants } from "./select-best-variants";

export type Filters = {
  providers?: string[];
  families?: string[];
  effort?: "best" | "all" | string;
  reasoning?: boolean;
  openWeights?: boolean;
  size?: string;
};

export type LeaderboardVariant = {
  model: string;
  family: string;
  effort: string;
  provider: string;
  reasoning: boolean;
  openWeights?: boolean | null;
  complete?: boolean;
  overallAccuracy: number;
  overallRuns: number;
  bySize: { size: string; runs: number; accuracy: number; totalCost: number }[];
};

export function scoreForSize(model: LeaderboardVariant, size?: string) {
  return size
    ? (model.bySize.find((entry) => entry.size === size)?.accuracy ?? 0)
    : model.overallAccuracy;
}
const CORE_SIZES = new Set(["5x5", "10x10", "15x15"]);
function costForSize(model: LeaderboardVariant, size?: string) {
  return model.bySize
    .filter((entry) =>
      size ? entry.size === size : CORE_SIZES.has(entry.size),
    )
    .reduce((sum, entry) => sum + entry.totalCost, 0);
}

// Select before size ranking: best effort is defined by the core overall result.
export function applyFilters<T extends LeaderboardVariant>(
  variants: T[],
  filters: Filters = {},
): T[] {
  const eligible = variants.filter(
    (model) =>
      (!filters.providers || filters.providers.includes(model.provider)) &&
      (!filters.families || filters.families.includes(model.family)) &&
      (filters.reasoning === undefined ||
        model.reasoning === filters.reasoning) &&
      (filters.openWeights === undefined ||
        model.openWeights === filters.openWeights) &&
      (!filters.effort ||
        filters.effort === "best" ||
        filters.effort === "all" ||
        model.effort === filters.effort),
  );
  const selected =
    !filters.effort || filters.effort === "best"
      ? selectBestVariants(eligible)
      : eligible;
  return selected
    .filter(
      (model) =>
        !filters.size ||
        model.bySize.some(
          (entry) => entry.size === filters.size && entry.runs > 0,
        ),
    )
    .sort(
      (a, b) =>
        Number(scoreForSize(b, filters.size).toFixed(1)) - Number(scoreForSize(a, filters.size).toFixed(1)) ||
        Number(costForSize(a, filters.size).toFixed(6)) - Number(costForSize(b, filters.size).toFixed(6)),
    );
}

export function validateFilters(
  variants: LeaderboardVariant[],
  filters: Filters,
  sizes: string[],
): string | null {
  const providers = new Set(variants.map((model) => model.provider));
  const families = new Set(variants.map((model) => model.family));
  const efforts = new Set(variants.map((model) => model.effort));
  for (const provider of filters.providers ?? [])
    if (!providers.has(provider))
      return `Unknown provider "${provider}". Use one of: ${[...providers].sort().join(", ")}.`;
  for (const family of filters.families ?? [])
    if (!families.has(family))
      return `Unknown family "${family}". Use one of: ${[...families].sort().join(", ")}.`;
  if (
    filters.effort &&
    filters.effort !== "best" &&
    filters.effort !== "all" &&
    !efforts.has(filters.effort)
  )
    return `Unknown effort "${filters.effort}". Use best, all, or: ${[...efforts].sort().join(", ")}.`;
  if (filters.size && !sizes.includes(filters.size))
    return `Unknown size "${filters.size}". Use one of: ${sizes.join(", ")}.`;
  return null;
}

export function parseApiFilters(params: URLSearchParams): {
  filters: Filters;
  error: string | null;
} {
  const list = (key: string) =>
    params.has(key)
      ? params
          .get(key)!
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
      : undefined;
  const bool = (key: string): boolean | undefined | null => {
    const value = params.get(key);
    return value === null
      ? undefined
      : value === "true"
        ? true
        : value === "false"
          ? false
          : null;
  };
  const reasoning = bool("reasoning");
  const openWeights = bool("open_weights");
  if (reasoning === null)
    return { filters: {}, error: 'Invalid reasoning. Use "true" or "false".' };
  if (openWeights === null)
    return {
      filters: {},
      error: 'Invalid open_weights. Use "true" or "false".',
    };
  return {
    filters: {
      providers: list("provider"),
      families: list("family"),
      effort: params.get("effort") ?? "all",
      reasoning,
      openWeights,
      size: params.get("size") ?? undefined,
    },
    error: null,
  };
}
