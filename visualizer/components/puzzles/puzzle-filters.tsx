"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import resultsData from "@/app/results.json";
import { EffortToggle, ModelsPopover, Switch } from "@/components/filter-bar";
import { applyFilters, VERSIONS, type BenchmarkVersion, type Filters, type LeaderboardVariant } from "@/lib/leaderboard";

export type DisplayModel = LeaderboardVariant & { displayName: string; familyDisplayName: string };
const models = resultsData.byModel as DisplayModel[];
export function puzzleModel(id: string) { return models.find((model) => model.model === id); }

export function usePuzzleFilters() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const filters: Filters = useMemo(() => ({
    providers: params.get("p") === "~" ? [] : params.get("p")?.split(",").filter(Boolean),
    families: params.get("f") === "~" ? [] : params.get("f")?.split(",").filter(Boolean),
    versions: params.get("v") === "~" ? [] : params.get("v")?.split(",").filter((value): value is BenchmarkVersion => VERSIONS.includes(value as BenchmarkVersion)),
    effort: params.get("e") ?? "best",
    reasoning: params.has("r") ? params.get("r") === "true" : undefined,
    openWeights: params.has("w") ? params.get("w") === "true" : undefined,
    // Like the homepage: variants that solved no puzzles are hidden unless z=1.
    minCorrect: params.get("z") === "1" ? 0 : 1,
  }), [params]);
  const filtered = useMemo(() => applyFilters(models, filters), [filters]);
  const change = (patch: Partial<Filters>) => {
    const next = new URLSearchParams(params.toString());
    if (Object.hasOwn(patch, "providers")) { if (patch.providers) next.set("p", patch.providers.length ? patch.providers.join(",") : "~"); else next.delete("p"); }
    if (Object.hasOwn(patch, "families")) { if (patch.families) next.set("f", patch.families.length ? patch.families.join(",") : "~"); else next.delete("f"); }
    if (Object.hasOwn(patch, "versions")) { if (patch.versions) next.set("v", patch.versions.length ? patch.versions.join(",") : "~"); else next.delete("v"); }
    if (Object.hasOwn(patch, "effort")) { if (patch.effort && patch.effort !== "best") next.set("e", patch.effort); else next.delete("e"); }
    if (Object.hasOwn(patch, "reasoning")) { if (patch.reasoning === undefined) next.delete("r"); else next.set("r", String(patch.reasoning)); }
    if (Object.hasOwn(patch, "openWeights")) { if (patch.openWeights === undefined) next.delete("w"); else next.set("w", String(patch.openWeights)); }
    if (Object.hasOwn(patch, "minCorrect")) { if (patch.minCorrect === 0) next.set("z", "1"); else next.delete("z"); }
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
  };
  return { filters, models: filtered, change, params };
}

// Same controls as the leaderboard bar: Models popover, Best/All, unsolved switch.
export function PuzzleFilters({ filters, change }: { filters: Filters; change: (patch: Partial<Filters>) => void; count?: number }) {
  const scope = { ...filters, effort: filters.effort ?? "best" };
  const hidden = applyFilters(models, { ...scope, minCorrect: 0 }).length - applyFilters(models, { ...scope, minCorrect: 1 }).length;
  return <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Model filters">
    <ModelsPopover filters={filters} change={change} sources={models} />
    <EffortToggle filters={filters} change={change} />
    {hidden > 0 && <Switch checked={filters.minCorrect === 0} onChange={(on) => change({ minCorrect: on ? 0 : 1 })} label={`Unsolved (${hidden})`} hint="Show variants that solved no puzzles" />}
  </div>;
}

export function usePuzzleExport() {
  const [data, setData] = useState<import("@/lib/puzzle-insights").PuzzleExport | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/puzzle-results.json", { signal: controller.signal }).then((response) => { if (!response.ok) throw new Error(); return response.json(); }).then(setData).catch((reason) => { if (reason?.name !== "AbortError") setError(true); });
    return () => controller.abort();
  }, []);
  return { data, error };
}
