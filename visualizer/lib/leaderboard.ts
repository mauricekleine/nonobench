import { selectBestVariants } from "./select-best-variants";

export const VERSIONS = ["1.0", "1.1", "1.2"] as const;
export type BenchmarkVersion = (typeof VERSIONS)[number];

// Older exports only distinguish the original and September batches.
export function variantVersion(model: { version?: BenchmarkVersion; legacy?: boolean }): BenchmarkVersion {
  return model.version ?? (model.legacy === false ? "1.2" : "1.0");
}

export type Filters = {
  providers?: string[];
  families?: string[];
  versions?: BenchmarkVersion[];
  effort?: "best" | "all" | string;
  reasoning?: boolean;
  openWeights?: boolean;
  size?: string;
  minCorrect?: number;
};

export type LeaderboardVariant = {
  model: string;
  family: string;
  effort: string;
  provider: string;
  reasoning: boolean;
  openWeights?: boolean | null;
  version?: BenchmarkVersion;
  legacy?: boolean;
  complete?: boolean;
  overallAccuracy: number;
  overallRuns: number;
  overallCorrect?: number;
  bySize: {
    size: string;
    runs: number;
    correct?: number;
    accuracy: number;
    totalCost: number;
  }[];
  displayName?: string;
  familyDisplayName?: string;
};

export function availableSizes(variants: LeaderboardVariant[]): string[] {
  return [
    ...new Set(
      variants.flatMap((model) =>
        model.bySize.filter((size) => size.runs > 0).map((size) => size.size),
      ),
    ),
  ];
}

// Exact variant IDs take precedence, including IDs that happen to equal a
// family ID. Human-readable family names always select the best core variant.
export function resolveModel<T extends LeaderboardVariant>(
  variants: T[],
  name: string,
): T | undefined {
  const normalized = name.trim().toLocaleLowerCase();
  if (!normalized) return undefined;
  const exact = variants.find(
    (model) => model.model.toLocaleLowerCase() === normalized,
  );
  if (exact) return exact;
  const family = variants.find(
    (model) =>
      model.family.toLocaleLowerCase() === normalized ||
      model.familyDisplayName?.toLocaleLowerCase() === normalized,
  )?.family;
  if (family)
    return selectBestVariants(
      variants.filter((model) => model.family === family),
    )[0];
  return variants.find(
    (model) => model.displayName?.toLocaleLowerCase() === normalized,
  );
}

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
      (!filters.versions || filters.versions.includes(variantVersion(model))) &&
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
    .filter((model) => {
      const correct = filters.size
        ? (() => {
            const entry = model.bySize.find((row) => row.size === filters.size);
            return entry?.correct ?? Math.round((entry?.accuracy ?? 0) * (entry?.runs ?? 0) / 100);
          })()
        : model.overallCorrect ??
          Math.round((model.overallAccuracy * model.overallRuns) / 100);
      return correct >= (filters.minCorrect ?? 0);
    })
    .sort(
      (a, b) =>
        Number(scoreForSize(b, filters.size).toFixed(1)) -
          Number(scoreForSize(a, filters.size).toFixed(1)) ||
        Number(costForSize(a, filters.size).toFixed(6)) -
          Number(costForSize(b, filters.size).toFixed(6)),
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
  for (const version of filters.versions ?? [])
    if (!VERSIONS.includes(version))
      return `Unknown version "${version}". Use one of: ${VERSIONS.join(", ")}.`;
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
  const minCorrectValue = params.get("min_correct");
  const minCorrect = minCorrectValue === null ? 0 : Number(minCorrectValue);
  if (
    (minCorrectValue !== null && !/^(0|[1-9]\d*)$/.test(minCorrectValue)) ||
    !Number.isSafeInteger(minCorrect)
  )
    return {
      filters: {},
      error: "Invalid min_correct. Use a non-negative integer.",
    };
  return {
    filters: {
      providers: parseCommaList(params.get("provider")),
      families: parseCommaList(params.get("family")),
      versions: parseCommaList(params.get("version")) as BenchmarkVersion[] | undefined,
      effort: params.get("effort")?.trim() || "all",
      reasoning,
      openWeights,
      size: params.get("size")?.trim() || undefined,
      minCorrect,
    },
    error: null,
  };
}

// Empty comma lists mean no restriction in REST, MCP, and page URLs.
export function parseCommaList(
  value: string | null | undefined,
): string[] | undefined {
  const entries = value
    ?.split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return entries?.length ? entries : undefined;
}

type UrlQuery = Record<
  "p" | "f" | "v" | "e" | "r" | "w" | "s" | "levels",
  string | null
>;
export function sanitizeUrlFilters(
  variants: LeaderboardVariant[],
  sizes: string[],
  query: UrlQuery,
): { filters: Filters; invalidKeys: (keyof UrlQuery)[] } {
  const invalidKeys: (keyof UrlQuery)[] = [];
  const providers = parseCommaList(query.p);
  const families = query.f === "~" ? [] : parseCommaList(query.f);
  const versions = query.v === "~" ? [] : parseCommaList(query.v) as BenchmarkVersion[] | undefined;
  const effort = query.e?.trim();
  const size = query.s?.trim();
  if (
    query.p !== null &&
    (!providers || validateFilters(variants, { providers }, sizes))
  )
    invalidKeys.push("p");
  if (
    query.f !== null &&
    query.f !== "~" &&
    (!families || validateFilters(variants, { families }, sizes))
  )
    invalidKeys.push("f");
  if (
    query.e !== null &&
    (!effort || validateFilters(variants, { effort }, sizes))
  )
    invalidKeys.push("e");
  if (query.v !== null && query.v !== "~" && (!versions || validateFilters(variants, { versions }, sizes)))
    invalidKeys.push("v");
  if (query.s !== null && (!size || validateFilters(variants, { size }, sizes)))
    invalidKeys.push("s");
  if (query.r !== null && query.r !== "true" && query.r !== "false")
    invalidKeys.push("r");
  if (query.w !== null && query.w !== "true" && query.w !== "false")
    invalidKeys.push("w");
  if (
    query.levels !== null &&
    query.levels !== "all" &&
    query.levels !== "best"
  )
    invalidKeys.push("levels");
  return {
    filters: {
      providers: invalidKeys.includes("p") ? undefined : providers,
      families: invalidKeys.includes("f") ? undefined : families,
      versions: invalidKeys.includes("v") ? undefined : versions,
      effort: invalidKeys.includes("e")
        ? query.levels === "all"
          ? "all"
          : "best"
        : (effort ?? (query.levels === "all" ? "all" : "best")),
      reasoning:
        invalidKeys.includes("r") || query.r === null
          ? undefined
          : query.r === "true",
      openWeights:
        invalidKeys.includes("w") || query.w === null
          ? undefined
          : query.w === "true",
      size: invalidKeys.includes("s") ? undefined : size || undefined,
    },
    invalidKeys,
  };
}
