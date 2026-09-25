"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import resultsData from "@/app/results.json";
import { ProviderLogo } from "@/components/provider-logos/provider-logo";
import { applyFilters, type Filters, type LeaderboardVariant } from "@/lib/leaderboard";
import { PROVIDERS } from "@/lib/providers";

export type DisplayModel = LeaderboardVariant & { displayName: string; familyDisplayName: string };
const models = resultsData.byModel as DisplayModel[];
const families = [...new Map(models.map((model) => [model.family, model.familyDisplayName])).entries()];
const providers = [...new Set(models.map((model) => model.provider))].sort();

export function usePuzzleFilters() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const filters: Filters = useMemo(() => ({
    providers: params.get("p") === "~" ? [] : params.get("p")?.split(",").filter(Boolean),
    families: params.get("f") === "~" ? [] : params.get("f")?.split(",").filter(Boolean),
    effort: params.get("e") ?? "best",
    reasoning: params.has("r") ? params.get("r") === "true" : undefined,
    openWeights: params.has("w") ? params.get("w") === "true" : undefined,
  }), [params]);
  const filtered = useMemo(() => applyFilters(models, filters), [filters]);
  const change = (patch: Partial<Filters>) => {
    const next = new URLSearchParams(params.toString());
    if (Object.hasOwn(patch, "providers")) { if (patch.providers) next.set("p", patch.providers.length ? patch.providers.join(",") : "~"); else next.delete("p"); }
    if (Object.hasOwn(patch, "families")) { if (patch.families) next.set("f", patch.families.length ? patch.families.join(",") : "~"); else next.delete("f"); }
    if (Object.hasOwn(patch, "effort")) { if (patch.effort && patch.effort !== "best") next.set("e", patch.effort); else next.delete("e"); }
    if (Object.hasOwn(patch, "reasoning")) { if (patch.reasoning === undefined) next.delete("r"); else next.set("r", String(patch.reasoning)); }
    if (Object.hasOwn(patch, "openWeights")) { if (patch.openWeights === undefined) next.delete("w"); else next.set("w", String(patch.openWeights)); }
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
  };
  return { filters, models: filtered, change, params };
}

const control = "rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember";
export function PuzzleFilters({ filters, change, count }: { filters: Filters; change: (patch: Partial<Filters>) => void; count: number }) {
  const [search, setSearch] = useState("");
  const selected = filters.families === undefined ? new Set(families.map(([id]) => id)) : new Set(filters.families);
  const selectedProviders = new Set(filters.providers ?? providers);
  const toggleFamily = (id: string) => { const next = new Set(selected); if (next.has(id)) next.delete(id); else next.add(id); change({ families: [...next] }); };
  const toggleProvider = (id: string) => { const next = new Set(selectedProviders); if (next.has(id)) next.delete(id); else next.add(id); change({ providers: next.size === providers.length ? undefined : [...next] }); };
  return <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card/70 p-3" aria-label="Model filters">
    <details className="relative"><summary className={`${control} cursor-pointer list-none`}>Models ({count})</summary>
      <div className="absolute left-0 top-full z-30 mt-1 max-h-80 w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-lg border border-border bg-card p-3 shadow-xl">
        <input aria-label="Search model families" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search models" className={`${control} mb-2 w-full`} />
        <div className="mb-2 flex gap-3 text-xs"><button onClick={() => change({ families: undefined, providers: undefined })} className="text-ember underline">All</button><button onClick={() => change({ families: [] })} className="text-ember underline">Clear</button></div>
        {providers.map((provider) => { const group = families.filter(([id, name]) => models.some((model) => model.family === id && model.provider === provider) && `${id} ${name} ${provider}`.toLowerCase().includes(search.toLowerCase()));
          return group.length ? <div key={provider} className="mb-3"><label className="mb-1 flex items-center gap-2 text-sm font-medium" style={{ color: PROVIDERS[provider]?.color }}><input type="checkbox" checked={selectedProviders.has(provider)} onChange={() => toggleProvider(provider)} /><ProviderLogo provider={provider} size={15} />{PROVIDERS[provider]?.name ?? provider}</label>
            {group.map(([id, name]) => <label key={id} className="flex cursor-pointer items-center gap-2 py-1 pl-2 text-xs"><input type="checkbox" checked={selected.has(id)} onChange={() => toggleFamily(id)} />{name}</label>)}
          </div> : null; })}
      </div>
    </details>
    <label className="text-xs text-muted-foreground">Effort <select className={control} value={filters.effort ?? "best"} onChange={(event) => change({ effort: event.target.value })}><option value="best">Best per family</option><option value="all">All</option>{[...new Set(models.map((model) => model.effort))].sort().map((effort) => <option key={effort} value={effort}>{effort}</option>)}</select></label>
    <label className="text-xs text-muted-foreground">Reasoning <select className={control} value={filters.reasoning === undefined ? "any" : String(filters.reasoning)} onChange={(event) => change({ reasoning: event.target.value === "any" ? undefined : event.target.value === "true" })}><option value="any">Any</option><option value="true">Yes</option><option value="false">No</option></select></label>
    <label className="text-xs text-muted-foreground">Weights <select className={control} value={filters.openWeights === undefined ? "any" : String(filters.openWeights)} onChange={(event) => change({ openWeights: event.target.value === "any" ? undefined : event.target.value === "true" })}><option value="any">Any</option><option value="true">Open</option><option value="false">Proprietary</option></select></label>
    <button className="text-xs text-ember underline focus-visible:outline-2 focus-visible:outline-ember" onClick={() => change({ providers: undefined, families: undefined, effort: "best", reasoning: undefined, openWeights: undefined })}>Reset</button>
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
