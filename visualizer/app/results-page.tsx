"use client";

import {
  CaretDown,
  Copy,
  DownloadSimple,
  GithubLogo,
  Question,
  Rows,
  XLogo,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ProviderLogo } from "@/components/provider-logos/provider-logo";
import { NonobenchMark } from "@/components/nonobench-mark";
import {
  applyFilters,
  availableSizes,
  type Filters,
} from "@/lib/leaderboard";
import { chartStats, type XMetric } from "@/lib/chart-data";
import { effortLabel, effortTitle, formatDuration } from "@/lib/display";
import { wilsonInterval } from "@/lib/insights";
import { PROVIDERS } from "@/lib/providers";
import { AccuracyScatter, EffortLadder, SizeBreakdown } from "./insight-charts";
import resultsData from "./results.json";

type SizeData = {
  size: string;
  accuracy: number;
  correct: number;
  runs: number;
  avgDurationMs: number;
  totalDurationMs: number;
  avgCost: number;
  totalCost: number;
  totalTokens: number;
};
type Model = {
  model: string;
  family: string;
  effort: string;
  provider: string;
  displayName: string;
  familyDisplayName: string;
  providerName: string;
  openWeights: boolean | null;
  addedAt: string | null;
  complete: boolean;
  timeouts: number;
  timeoutNote: string | null;
  reasoning: boolean;
  overallAccuracy: number;
  overallCorrect: number;
  overallRuns: number;
  bySize: SizeData[];
};
type Results = {
  timestamp: string;
  summary: { sizes: string[]; coreSizes: string[] };
  byModel: Model[];
};
const results = resultsData as Results;
const allFamilies = [...new Set(results.byModel.map((model) => model.family))];
const providerGroups = [
  ...new Set(results.byModel.map((model) => model.provider)),
]
  .sort()
  .map((id) => ({
    id,
    families: allFamilies.filter((family) =>
      results.byModel.some(
        (model) => model.family === family && model.provider === id,
      ),
    ),
  }));
const displayedSizes = results.summary.sizes.filter((size) =>
  availableSizes(results.byModel).includes(size),
);
const effortLevels = [
  ...new Set(results.byModel.map((model) => model.effort)),
].sort();
const control =
  "inline-flex min-h-9 items-center justify-center gap-2 rounded-full border border-border bg-foreground/5 px-3 text-sm text-foreground hover:bg-foreground/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-bright";
const formatCost = (value: number) =>
  value < 0.01 ? `$${value.toFixed(4)}` : `$${value.toFixed(2)}`;

function IncompleteBadge({ model }: { model: Model }) {
  return (
    <Popover>
      <PopoverTrigger
        type="button"
        className="shrink-0 rounded-full bg-ember/13 px-1.5 py-0.5 font-mono text-[10px] text-ember focus-visible:outline-2 focus-visible:outline-ember-bright"
      >
        incomplete
      </PopoverTrigger>
      <PopoverContent side="bottom">
        {model.timeouts > 0 ? (
          <>
            <strong className="text-foreground">
              {model.timeouts} puzzles without an answer
            </strong>
            <p className="mt-1">
              {model.timeoutNote ??
                "The provider ended these requests before the model answered."}{" "}
              These attempts count as unsolved.
            </p>
          </>
        ) : (
          <p>
            Not every puzzle has a finished run yet; the score covers finished
            runs.
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}

function ModelName({ model }: { model: Model }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <ProviderLogo
        provider={model.provider}
        size={16}
        className="shrink-0 text-foreground"
      />
      {/* The effort badge already names the level, so the family name suffices. */}
      <span className="min-w-0 truncate" title={model.displayName}>
        {model.familyDisplayName}
      </span>
      <span title={effortTitle(model.effort)} className="shrink-0 rounded border border-line-strong px-1.5 py-0.5 font-mono text-[10px] leading-none text-muted-foreground">
        {effortLabel(model.effort)}
      </span>
    </span>
  );
}

export default function ResultsPage({
  filters,
  onFiltersChange,
  metric,
  onMetricChange,
  includeUnsolved,
  onIncludeUnsolvedChange,
  perPuzzle,
  onPerPuzzleChange,
}: {
  filters: Filters;
  onFiltersChange: (patch: Partial<Filters>) => void;
  metric: XMetric;
  onMetricChange: (metric: XMetric) => void;
  includeUnsolved: boolean;
  onIncludeUnsolvedChange: (include: boolean) => void;
  perPuzzle: boolean;
  onPerPuzzleChange: (average: boolean) => void;
}) {
  const [search, setSearch] = useState("");
  const [aboutOpen, setAboutOpen] = useState(false);
  const [sort, setSort] = useState<{ key: string; desc: boolean }>({
    key: "accuracy",
    desc: true,
  });
  const [copyDone, setCopyDone] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const selectedFamilies = useMemo(
    () =>
      new Set(
        allFamilies.filter(
          (family) =>
            (!filters.families || filters.families.includes(family)) &&
            (!filters.providers ||
              results.byModel.some(
                (model) =>
                  model.family === family &&
                  filters.providers!.includes(model.provider),
              )),
        ),
      ),
    [filters.families, filters.providers],
  );
  const chosen = useMemo(
    () => applyFilters(results.byModel, filters),
    [filters],
  );
  const hiddenCount = useMemo(() => {
    const scope = { ...filters, effort: "all" };
    return applyFilters(results.byModel, { ...scope, minCorrect: 0 }).length -
      applyFilters(results.byModel, { ...scope, minCorrect: 1 }).length;
  }, [filters]);
  const size = filters.size;
  const allLevels = filters.effort === "all";
  const rows = useMemo(
    () =>
      [...chosen].sort((a, b) => {
        const aStats = chartStats(a, size),
          bStats = chartStats(b, size);
        const aValue =
          sort.key === "accuracy"
            ? aStats.accuracy
            : sort.key === "cost"
              ? perPuzzle ? aStats.cost / aStats.runs : aStats.cost
              : perPuzzle ? aStats.time / aStats.runs : aStats.time;
        const bValue =
          sort.key === "accuracy"
            ? bStats.accuracy
            : sort.key === "cost"
              ? perPuzzle ? bStats.cost / bStats.runs : bStats.cost
              : perPuzzle ? bStats.time / bStats.runs : bStats.time;
        return (
          (sort.desc ? bValue - aValue : aValue - bValue) ||
          a.model.localeCompare(b.model)
        );
      }),
    [chosen, size, sort, perPuzzle],
  );
  const updateFamilySelection = (next: Set<string>) =>
    onFiltersChange({
      providers: undefined,
      families: next.size === allFamilies.length ? undefined : [...next],
    });
  const toggleFamily = (family: string) => {
    const next = new Set(selectedFamilies);
    if (next.has(family)) next.delete(family);
    else next.add(family);
    updateFamilySelection(next);
  };
  const toggleProvider = (provider: string) => {
    const next = new Set(selectedFamilies);
    const group = providerGroups.find((entry) => entry.id === provider)!;
    const all = group.families.every((family) => next.has(family));
    for (const family of group.families) {
      if (all) next.delete(family);
      else next.add(family);
    }
    updateFamilySelection(next);
  };
  const downloadChart = async () => {
    if (!chartRef.current) return;
    const { toPng } = await import("html-to-image");
    const url = await toPng(chartRef.current, {
      pixelRatio: 2,
      backgroundColor: "#11110f",
    });
    const link = document.createElement("a");
    link.href = url;
    link.download = "nonobench-leaderboard.png";
    link.click();
  };
  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopyDone(true);
    window.setTimeout(() => setCopyDone(false), 2000);
  };
  const sortButton = (label: string, key: string) => (
    <button
      type="button"
      className="hover:text-foreground focus-visible:outline-2 focus-visible:outline-ember-bright"
      onClick={() =>
        setSort((old) => ({
          key,
          desc: old.key === key ? !old.desc : key === "accuracy",
        }))
      }
    >
      {label}
      {sort.key === key ? (sort.desc ? " ↓" : " ↑") : ""}
    </button>
  );

  return (
    <div className="min-h-screen overflow-x-clip bg-background">
      <div className="noise-overlay" />
      <div className="pointer-events-none fixed inset-0 grid-pattern" />
      <div className="pointer-events-none fixed inset-0 atmosphere" />
      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        <header className="mb-8">
          <div className="nono-trigger mb-4 flex w-fit items-end gap-4">
            <NonobenchMark />
            <h1 className="pb-px font-display text-3xl font-semibold lowercase leading-none tracking-[-0.02em] sm:text-4xl">
              nonobench<span className="sr-only"> results</span>
            </h1>
          </div>
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
            Benchmark results for LLM performance on Nonogram puzzle solving.
            Compare accuracy, speed, and cost across grid sizes.
          </p>
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 font-mono text-xs text-dim">
            <span>{allFamilies.length} model families</span>
            <span>{results.byModel.length} variants</span>
            <span>
              Updated {new Date(results.timestamp).toLocaleDateString()}
            </span>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              className={control}
              onClick={() => setAboutOpen(!aboutOpen)}
              aria-expanded={aboutOpen}
            >
              <Question size={16} />
              What are Nonograms?
              <CaretDown size={13} />
            </button>
            <Link href="/puzzles" className={control}>
              <Rows size={16} />
              Explore puzzles
            </Link>
            <a href="/results-raw.json" download className={control}>
              <DownloadSimple size={16} />
              Raw results
            </a>
          </div>
          {aboutOpen && (
            <div className="mt-3 max-w-2xl rounded-lg border border-border bg-card p-5 text-sm leading-relaxed text-muted-foreground">
              Nonograms are logic puzzles solved by filling cells according to
              row and column clues. A model scores when its answer satisfies
              every clue. The headline score covers 5×5, 10×10 and 15×15
              puzzles.
            </div>
          )}
        </header>
        <div
          role="group"
          aria-label="Leaderboard filters"
          className="mb-5 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-foreground/5 p-3"
        >
          <Popover>
            <PopoverTrigger type="button" className={control}>
              Models{" "}
              <span className="font-mono text-xs text-muted-foreground">
                {selectedFamilies.size} of {allFamilies.length}
              </span>
              <CaretDown size={13} />
            </PopoverTrigger>
            <PopoverContent
              side="bottom"
              className="w-[min(24rem,calc(100vw-2rem))] p-0"
            >
              <div className="border-b border-border p-3">
                <label htmlFor="model-search" className="sr-only">
                  Search models
                </label>
                <input
                  id="model-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search models or providers"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ember"
                />
                <div className="mt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => updateFamilySelection(new Set(allFamilies))}
                    className="text-ember hover:underline"
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    onClick={() => updateFamilySelection(new Set())}
                    className="text-ember hover:underline"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onFiltersChange({
                        providers: undefined,
                        families: undefined,
                        effort: "best",
                        reasoning: undefined,
                        openWeights: undefined,
                        size: undefined,
                      });
                      setSearch("");
                    }}
                    className="text-ember hover:underline"
                  >
                    Reset
                  </button>
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto p-3">
                {providerGroups.map((group) => {
                  const families = group.families.filter((family) =>
                    `${family} ${results.byModel.find((model) => model.family === family)?.familyDisplayName ?? ""} ${group.id}`
                      .toLowerCase()
                      .includes(search.toLowerCase()),
                  );
                  if (!families.length) return null;
                  const selectedCount = group.families.filter((family) =>
                    selectedFamilies.has(family),
                  ).length;
                  return (
                    <div key={group.id} className="mb-3">
                      <label className="flex items-center gap-2 py-1 text-sm font-medium text-foreground">
                        <input
                          type="checkbox"
                          checked={selectedCount === group.families.length}
                          ref={(node) => {
                            if (node)
                              node.indeterminate =
                                selectedCount > 0 &&
                                selectedCount < group.families.length;
                          }}
                          onChange={() => toggleProvider(group.id)}
                        />
                        <ProviderLogo provider={group.id} size={15} />
                        {PROVIDERS[group.id]?.name ?? group.id}
                        <span className="ml-auto font-mono text-xs text-dim">
                          {selectedCount}/{group.families.length}
                        </span>
                      </label>
                      {families.map((family) => (
                        <label
                          key={family}
                          className="ml-5 flex items-center gap-2 py-1 text-xs text-muted-foreground"
                        >
                          <input
                            type="checkbox"
                            checked={selectedFamilies.has(family)}
                            onChange={() => toggleFamily(family)}
                          />
                          <span className="truncate">
                            {results.byModel.find(
                              (model) => model.family === family,
                            )?.familyDisplayName ?? family}
                          </span>
                        </label>
                      ))}
                    </div>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger type="button" className={control}>
              Filters
              {(filters.reasoning !== undefined ||
                filters.openWeights !== undefined) && (
                <>
                  <span
                    aria-hidden="true"
                    className="size-1.5 rounded-full bg-ember"
                  />
                  <span className="sr-only">Active filters</span>
                </>
              )}
              <CaretDown size={13} />
            </PopoverTrigger>
            <PopoverContent side="bottom" className="w-56 space-y-3">
              <label className="block text-sm text-foreground">
                Reasoning
                <select
                  value={
                    filters.reasoning === undefined
                      ? "any"
                      : String(filters.reasoning)
                  }
                  onChange={(event) =>
                    onFiltersChange({
                      reasoning:
                        event.target.value === "any"
                          ? undefined
                          : event.target.value === "true",
                    })
                  }
                  className="mt-1 w-full rounded border border-border bg-background p-2 text-sm"
                >
                  <option value="any">Any</option>
                  <option value="true">Reasoning</option>
                  <option value="false">Non-reasoning</option>
                </select>
              </label>
              <label className="block text-sm text-foreground">
                Weights
                <select
                  value={
                    filters.openWeights === undefined
                      ? "any"
                      : String(filters.openWeights)
                  }
                  onChange={(event) =>
                    onFiltersChange({
                      openWeights:
                        event.target.value === "any"
                          ? undefined
                          : event.target.value === "true",
                    })
                  }
                  className="mt-1 w-full rounded border border-border bg-background p-2 text-sm"
                >
                  <option value="any">Any</option>
                  <option value="true">Open weights</option>
                  <option value="false">Proprietary</option>
                </select>
              </label>
            </PopoverContent>
          </Popover>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            Effort{" "}
            <select
              value={filters.effort ?? "best"}
              onChange={(event) =>
                onFiltersChange({ effort: event.target.value })
              }
              className={control + " appearance-none pr-8"}
            >
              <option value="best">Best</option>
              <option value="all">All levels</option>
              {effortLevels.map((level) => (
                <option key={level} value={level}>
                  {effortLabel(level)}
                </option>
              ))}
            </select>
            <CaretDown size={13} className="-ml-8 mr-3 pointer-events-none text-foreground" aria-hidden="true" />
          </label>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            Size{" "}
            <select
              value={size ?? "all"}
              onChange={(event) =>
                onFiltersChange({
                  size:
                    event.target.value === "all"
                      ? undefined
                      : event.target.value,
                })
              }
              className={control + " appearance-none pr-8"}
            >
              <option value="all">Core overall</option>
              {displayedSizes.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <CaretDown size={13} className="-ml-8 mr-3 pointer-events-none text-foreground" aria-hidden="true" />
          </label>
        </div>
        {hiddenCount > 0 && (
          <p className="mb-5 -mt-2 text-xs text-muted-foreground">
            {includeUnsolved
              ? `${hiddenCount} variants that solved no puzzles are shown`
              : `${hiddenCount} variants that solved no puzzles are hidden`}{" "}
            ·{" "}
            <button type="button" className="text-ember underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-ember-bright" onClick={() => onIncludeUnsolvedChange(!includeUnsolved)}>
              {includeUnsolved ? "Hide them" : "Show them"}
            </button>
          </p>
        )}
        <section className="mb-10">
          <Card className="pb-0">
            <div ref={chartRef}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle>
                    <h2 className="font-display text-base font-medium lowercase">
                      model accuracy
                    </h2>
                  </CardTitle>
                  <span className="font-mono text-xs text-dim">
                    {chosen.length} {allLevels ? "variants" : "models"} ·{" "}
                    {size ?? "core overall"}
                  </span>
                </div>
                <Popover>
                  <PopoverTrigger
                    type="button"
                    className="mt-2 text-left text-xs text-muted-foreground underline decoration-dotted underline-offset-2 focus-visible:outline-2 focus-visible:outline-ember-bright"
                  >
                    What do the thin ranges mean?
                  </PopoverTrigger>
                  <PopoverContent side="bottom">
                    The thin whiskers show 95% Wilson intervals. With 30
                    puzzles, one puzzle is 3.3 points; overlapping ranges are
                    statistically close.
                  </PopoverContent>
                </Popover>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 pb-6">
                  {chosen.length === 0 && (
                    <p className="py-10 text-center text-sm text-muted-foreground">
                      No models match these filters. Select more models or
                      change the filters.
                    </p>
                  )}
                  {chosen.map((model) => {
                    const value = chartStats(model, size);
                    const interval = wilsonInterval(value.correct, value.runs);
                    return (
                      <div
                        key={model.model}
                        className="grid min-w-0 grid-cols-[minmax(0,1fr)_7.5rem] items-center gap-x-2 gap-y-1 border-b border-border/40 py-2 sm:grid-cols-[minmax(12rem,19rem)_minmax(0,1fr)_7.5rem]"
                      >
                        <div className="col-start-1 row-start-1 flex min-w-0 items-center gap-1.5 text-xs sm:text-sm">
                          <ModelName model={model} />
                          {!model.complete && <IncompleteBadge model={model} />}
                        </div>
                        <Tooltip>
                          <TooltipTrigger
                            type="button"
                            aria-label={`${model.displayName}: ${value.accuracy.toFixed(1)}% accuracy, 95% interval ${(interval.low * 100).toFixed(0)} to ${(interval.high * 100).toFixed(0)}%; ${value.correct} of ${value.runs} correct; ${formatCost(perPuzzle ? value.cost / value.runs : value.cost)} ${perPuzzle ? "cost per puzzle" : "total cost"}; ${formatDuration(perPuzzle ? value.time / value.runs : value.time)} ${perPuzzle ? "time per puzzle" : "total time"}`}
                            className="relative col-span-2 col-start-1 row-start-2 h-5 w-full rounded-sm bg-foreground/5 text-left focus-visible:outline-2 focus-visible:outline-ember-bright sm:col-span-1 sm:col-start-2 sm:row-start-1"
                          >
                            <span
                              className="block h-full rounded-sm"
                              style={{
                                width: `${Math.max(value.accuracy, value.accuracy > 0 ? 1 : 0)}%`,
                                backgroundColor:
                                  PROVIDERS[model.provider]?.color ?? "#D8A46B",
                              }}
                            />
                            <span
                              className="absolute top-1/2 h-px -translate-y-1/2 bg-foreground"
                              style={{
                                left: `${interval.low * 100}%`,
                                width: `${(interval.high - interval.low) * 100}%`,
                              }}
                            />
                            <span
                              className="absolute top-1/2 h-2 -translate-y-1/2 border-l border-foreground"
                              style={{ left: `${interval.low * 100}%` }}
                            />
                            <span
                              className="absolute top-1/2 h-2 -translate-y-1/2 border-l border-foreground"
                              style={{ left: `${interval.high * 100}%` }}
                            />
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <strong>{model.displayName}</strong>
                            <p>
                              {value.correct}/{value.runs} solved ·{" "}
                              {value.accuracy.toFixed(1)}% · 95% interval{" "}
                              {(interval.low * 100).toFixed(0)}–
                              {(interval.high * 100).toFixed(0)}%
                            </p>
                            <p>
                              {perPuzzle ? "Cost / puzzle" : "Total cost"} {formatCost(perPuzzle ? value.cost / value.runs : value.cost)} · {perPuzzle ? "Time / puzzle" : "Total time"}{" "}
                              {formatDuration(perPuzzle ? value.time / value.runs : value.time)}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                        <span className="col-start-2 row-start-1 text-right font-mono text-[10px] font-medium tabular-nums sm:col-start-3 sm:text-xs">
                          {value.accuracy.toFixed(1)}%{" "}
                          <span className="text-muted-foreground">
                            ({(interval.low * 100).toFixed(0)}–
                            {(interval.high * 100).toFixed(0)}%)
                          </span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </div>
            <div className="flex flex-wrap gap-2 px-6 pb-5">
              <button type="button" className={control} onClick={copyLink}>
                <Copy size={15} />
                {copyDone ? "Copied" : "Copy link"}
              </button>
              <button type="button" className={control} onClick={downloadChart}>
                <DownloadSimple size={15} />
                Download chart as PNG
              </button>
            </div>
          </Card>
        </section>
        <AccuracyScatter
          models={chosen}
          size={size}
          metric={metric}
          onMetricChange={onMetricChange}
        />
        <EffortLadder models={results.byModel} filters={filters} />
        <SizeBreakdown models={chosen} size={size} />
        <section className="mt-10 rounded-lg border border-border bg-card" aria-labelledby="details-heading">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-6">
            <div>
              <h2 id="details-heading" className="font-display text-base font-medium lowercase">detailed model statistics</h2>
              <p className="mt-1 text-sm text-muted-foreground">Accuracy and usage for the selected tier.</p>
            </div>
            <div role="group" aria-label="Cost and time units" className="inline-flex rounded-md border border-border bg-background p-1 text-xs">
              {([false, true] as const).map((average) => (
                <button key={String(average)} type="button" aria-pressed={perPuzzle === average} onClick={() => onPerPuzzleChange(average)} className={`rounded px-2.5 py-1.5 focus-visible:outline-2 focus-visible:outline-ember-bright ${perPuzzle === average ? "bg-ember text-background" : "text-muted-foreground hover:text-foreground"}`}>
                  {average ? "Per puzzle" : "Totals"}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-sm">
              <thead>
                <tr className="border-b border-border bg-foreground/5 text-left">
                  <th className="sticky left-0 bg-card px-4 py-3">Model</th>
                  <th
                    className="px-3 py-3"
                    aria-sort={
                      sort.key === "accuracy"
                        ? sort.desc
                          ? "descending"
                          : "ascending"
                        : "none"
                    }
                  >
                    {sortButton(
                      size ? `${size} accuracy` : "Core accuracy",
                      "accuracy",
                    )}
                    <span className="block text-[10px] font-normal text-muted-foreground">
                      95% interval
                    </span>
                  </th>
                  {results.summary.sizes.map((value) => (
                    <th key={value} className="px-3 py-3">
                      {value}
                    </th>
                  ))}
                  <th
                    className="px-3 py-3"
                    aria-sort={
                      sort.key === "cost"
                        ? sort.desc
                          ? "descending"
                          : "ascending"
                        : "none"
                    }
                  >
                    {sortButton(perPuzzle ? "Cost / puzzle" : "Total cost", "cost")}
                  </th>
                  <th
                    className="px-3 py-3"
                    aria-sort={
                      sort.key === "time"
                        ? sort.desc
                          ? "descending"
                          : "ascending"
                        : "none"
                    }
                  >
                    {sortButton(perPuzzle ? "Time / puzzle" : "Total time", "time")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((model) => {
                  const value = chartStats(model, size);
                  const interval = wilsonInterval(value.correct, value.runs);
                  return (
                    <tr
                      key={model.model}
                      className="border-b border-border/50 last:border-b-0 hover:bg-foreground/5"
                    >
                      <td className="sticky left-0 max-w-64 bg-card px-4 py-3">
                        <div className="flex items-center gap-1">
                          <ModelName model={model} />
                          {!model.complete && <IncompleteBadge model={model} />}
                        </div>
                      </td>
                      <td className="px-3 py-3 font-mono text-ember">
                        {value.accuracy.toFixed(1)}%{" "}
                        <span className="text-xs text-muted-foreground">
                          ({(interval.low * 100).toFixed(0)}–
                          {(interval.high * 100).toFixed(0)}%)
                        </span>
                      </td>
                      {results.summary.sizes.map((grid) => {
                        const entry = model.bySize.find(
                          (row) => row.size === grid && row.runs > 0,
                        );
                        return (
                          <td
                            key={grid}
                            className="px-3 py-3 font-mono text-muted-foreground"
                          >
                            {entry ? `${entry.accuracy.toFixed(0)}%` : "—"}
                          </td>
                        );
                      })}
                      <td className="px-3 py-3 font-mono text-muted-foreground">
                        {formatCost(perPuzzle ? value.cost / value.runs : value.cost)}
                      </td>
                      <td className="px-3 py-3 font-mono text-muted-foreground">
                        {formatDuration(perPuzzle ? value.time / value.runs : value.time)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
        <section className="mt-10 rounded-lg border border-border bg-card p-4 sm:p-6" aria-labelledby="grid-stats-heading">
          <h2 id="grid-stats-heading" className="font-display text-base font-medium lowercase">statistics by grid size</h2>
          <p className="mt-1 text-sm text-muted-foreground">Combined results for the selected models.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {results.summary.sizes.map((grid, index) => {
              const entries = chosen
                .map((model) => model.bySize.find((row) => row.size === grid))
                .filter((row): row is SizeData => !!row && row.runs > 0);
              const runs = entries.reduce((sum, row) => sum + row.runs, 0);
              if (!runs) return null;
              const correct = entries.reduce(
                (sum, row) => sum + row.correct,
                0,
              );
              const totalCost = entries.reduce(
                (sum, row) => sum + row.totalCost,
                0,
              );
              const totalTime = entries.reduce(
                (sum, row) => sum + row.totalDurationMs,
                0,
              );
              const color = ["#70B8FF", "#46FEA5", "#FFCA16", "#C69CFF"][index];
              return (
                <Card key={grid}>
                  <CardHeader>
                    <CardTitle>
                      <span
                        className="rounded px-2 py-1 font-mono text-sm"
                        style={{ color, backgroundColor: `${color}20` }}
                      >
                        {grid}
                      </span>
                      <span className="ml-3 text-sm font-normal text-muted-foreground">
                        {entries.length} models
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-display text-2xl">
                      {((correct / runs) * 100).toFixed(1)}%
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {correct}/{runs} solved
                    </p>
                    <div className="mt-4 flex gap-4 border-t border-border pt-3 font-mono text-xs text-muted-foreground">
                      <span>{formatDuration(totalTime / runs)} avg time</span>
                      <span>{formatCost(totalCost / runs)} avg cost</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
        <footer className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-8 text-sm text-muted-foreground">
          <span>Nonobench · Nonogram puzzle benchmark for LLMs</span>
          <span className="flex gap-5">
            <a
              href="https://github.com/mauricekleine/nono-bench"
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              <GithubLogo size={16} />
              GitHub
            </a>
            <a
              href="https://x.com/mauricekleine"
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              <XLogo size={16} />
              @mauricekleine
            </a>
          </span>
        </footer>
      </div>
    </div>
  );
}
