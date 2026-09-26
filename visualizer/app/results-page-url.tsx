"use client";

import { parseAsString, useQueryStates } from "nuqs";
import { useEffect } from "react";
import {
  availableSizes,
  sanitizeUrlFilters,
  type Filters,
} from "@/lib/leaderboard";
import { type XMetric } from "@/lib/chart-data";
import ResultsPage from "./results-page";
import resultsData from "./results.json";

// Short shareable parameters. Null means the default and is omitted by nuqs.
const parsers = {
  p: parseAsString,
  f: parseAsString,
  v: parseAsString,
  e: parseAsString,
  r: parseAsString,
  w: parseAsString,
  s: parseAsString,
  levels: parseAsString,
  x: parseAsString,
  z: parseAsString,
  u: parseAsString,
};
export function UrlResultsPage() {
  const [query, setQuery] = useQueryStates(parsers);
  const { filters, invalidKeys } = sanitizeUrlFilters(
    resultsData.byModel,
    availableSizes(resultsData.byModel),
    query,
  );
  const invalidSignature = invalidKeys.join(",");
  useEffect(() => {
    if (!invalidSignature) return;
    const cleared: Partial<Record<keyof typeof parsers, null>> = {};
    for (const key of invalidSignature.split(",") as (keyof typeof parsers)[])
      cleared[key] = null;
    void setQuery(cleared);
  }, [invalidSignature, setQuery]);
  const change = (patch: Partial<Filters>) => {
    void setQuery({
      ...(Object.hasOwn(patch, "providers")
        ? { p: patch.providers?.join(",") ?? null }
        : {}),
      ...(Object.hasOwn(patch, "families")
        ? {
            f: patch.families
              ? patch.families.length
                ? patch.families.join(",")
                : "~"
              : null,
          }
        : {}),
      ...(Object.hasOwn(patch, "versions")
        ? { v: patch.versions ? (patch.versions.length ? patch.versions.join(",") : "~") : null }
        : {}),
      ...(Object.hasOwn(patch, "effort")
        ? {
            e: patch.effort && patch.effort !== "best" ? patch.effort : null,
            levels: null,
          }
        : {}),
      ...(Object.hasOwn(patch, "reasoning")
        ? { r: patch.reasoning === undefined ? null : String(patch.reasoning) }
        : {}),
      ...(Object.hasOwn(patch, "openWeights")
        ? {
            w:
              patch.openWeights === undefined
                ? null
                : String(patch.openWeights),
          }
        : {}),
      ...(Object.hasOwn(patch, "size") ? { s: patch.size ?? null } : {}),
    });
  };
  const metric: XMetric =
    query.x === "time" || query.x === "tokens" ? query.x : "cost";
  return (
    <ResultsPage
      // Standard hides variants that solved nothing; Hard mode shows every run.
      filters={{ ...filters, minCorrect: 1 }}
      onFiltersChange={change}
      metric={metric}
      onMetricChange={(x) => {
        void setQuery({ x: x === "cost" ? null : x });
      }}
      perPuzzle={query.u === "avg"}
      onPerPuzzleChange={(average) => void setQuery({ u: average ? "avg" : null })}
    />
  );
}

export function DefaultResultsPage() {
  return (
    <ResultsPage
      filters={{ effort: "best", minCorrect: 1 }}
      onFiltersChange={() => {}}
      metric="cost"
      onMetricChange={() => {}}
      perPuzzle={false}
      onPerPuzzleChange={() => {}}
    />
  );
}
