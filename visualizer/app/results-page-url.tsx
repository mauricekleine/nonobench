"use client";

import { parseAsString, useQueryStates } from "nuqs";
import { type Filters } from "@/lib/leaderboard";
import ResultsPage from "./results-page";

// Short shareable parameters. Null means the default and is omitted by nuqs.
const parsers = {
  p: parseAsString,
  f: parseAsString,
  e: parseAsString,
  r: parseAsString,
  w: parseAsString,
  s: parseAsString,
  levels: parseAsString,
};
export function UrlResultsPage() {
  const [query, setQuery] = useQueryStates(parsers);
  const filters: Filters = {
    providers: query.p ? query.p.split(",") : undefined,
    families: query.f === "~" ? [] : query.f ? query.f.split(",") : undefined,
    effort: query.e ?? (query.levels === "all" ? "all" : "best"),
    reasoning: query.r === null ? undefined : query.r === "true",
    openWeights: query.w === null ? undefined : query.w === "true",
    size: query.s ?? undefined,
  };
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
  return <ResultsPage filters={filters} onFiltersChange={change} />;
}

export function DefaultResultsPage() {
  return (
    <ResultsPage filters={{ effort: "best" }} onFiltersChange={() => {}} />
  );
}
