"use client";

import {
  Copy,
  DownloadSimple,
  GridFour,
  GithubLogo,
  Question,
  Info,
  Rows,
  XLogo,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  type BenchmarkVersion,
  type Filters,
} from "@/lib/leaderboard";
import { chartStats, type XMetric } from "@/lib/chart-data";
import { effortLabel, effortTitle, formatCost, formatDuration, shortSizeLabel, sizeLabel } from "@/lib/display";
import { wilsonInterval } from "@/lib/insights";
import { PROVIDERS } from "@/lib/providers";
import { AccuracyScatter, EffortLadder } from "./insight-charts";
import { HardModeIntro, HardModeMisses } from "./hard-mode";
import { EffortToggle, ModelsPopover, Segmented } from "@/components/filter-bar";
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
  version?: BenchmarkVersion;
  legacy?: boolean;
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
const familiesWithResults = new Set(results.byModel.filter((model) => model.overallCorrect > 0).map((model) => model.family)).size;
const variantsWithResults = results.byModel.filter((model) => model.overallCorrect > 0).length;
const HARD_SIZE = "20x20";
const displayedSizes = results.summary.sizes.filter((size) =>
  availableSizes(results.byModel).includes(size),
);
const hasHardMode = displayedSizes.includes(HARD_SIZE);
const standardSizes = displayedSizes.filter((size) => size !== HARD_SIZE);
// Run progress per variant, for watching a benchmark wave locally. Shown in
// `next dev`, or in a local production build with NEXT_PUBLIC_SHOW_PROGRESS=1.
const showProgress =
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_SHOW_PROGRESS === "1";

function IncompleteBadge({ model, size }: { model: Model; size?: string }) {
  const runs = chartStats(model, size).runs;
  const expected = size ? 10 : 30;
  // Only while puzzles are still missing; timeouts are finished attempts.
  const progress = showProgress && runs < expected ? ` ${runs}/${expected}` : "";
  return (
    <Popover>
      <PopoverTrigger render={<Button variant="ghost" />}>
        <Badge variant="secondary">incomplete{progress}</Badge>
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
            Some puzzles don’t have a finished run yet. The score covers finished
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
      <Badge variant="outline" title={effortTitle(model.effort)}>
        {effortLabel(model.effort)}
      </Badge>
    </span>
  );
}

export default function ResultsPage({
  filters: baseFilters,
  onFiltersChange,
  metric,
  onMetricChange,
  perPuzzle,
  onPerPuzzleChange,
}: {
  filters: Filters;
  onFiltersChange: (patch: Partial<Filters>) => void;
  metric: XMetric;
  onMetricChange: (metric: XMetric) => void;
  perPuzzle: boolean;
  onPerPuzzleChange: (average: boolean) => void;
}) {
  const isHard = baseFilters.size === HARD_SIZE;
  // Hard mode shows every variant that ran it: 0/10 is information there.
  const filters = useMemo(
    () => (isHard ? { ...baseFilters, minCorrect: 0 } : baseFilters),
    [isHard, baseFilters],
  );
  const [sort, setSort] = useState<{ key: string; desc: boolean }>({
    key: "accuracy",
    desc: true,
  });
  const [copyDone, setCopyDone] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const chosen = useMemo(
    () => applyFilters(results.byModel, filters),
    [filters],
  );
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
  const downloadChart = async () => {
    if (!chartRef.current) return;
    const { toPng } = await import("html-to-image");
    const url = await toPng(chartRef.current, {
      pixelRatio: 2,
      backgroundColor: "#0b0e1e",
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
    <Button
      variant="ghost"
      onClick={() =>
        setSort((old) => ({
          key,
          desc: old.key === key ? !old.desc : key === "accuracy",
        }))
      }
    >
      {label}
      {sort.key === key ? (sort.desc ? " ↓" : " ↑") : ""}
    </Button>
  );

  return (
    <div className="min-h-screen overflow-x-clip bg-background">
      <div className="noise-overlay" />
      <div className="pointer-events-none fixed inset-0 grid-pattern" />
      <div className="pointer-events-none fixed inset-0 atmosphere" />
      <div className="relative mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-8">
        <header className="mb-3 sm:mb-6">
          <div className="nono-trigger mb-2 flex w-fit items-end gap-2 sm:mb-3 sm:gap-4">
            <NonobenchMark size="sm" />
            <h1 className="pb-px font-display text-2xl font-semibold lowercase leading-[1.1] tracking-[-0.02em]">
              nonobench<span className="sr-only"> results</span>
            </h1>
            <Badge render={<Link href="/how-it-works#whats-new" />} variant="outline">v1.2</Badge>
          </div>
          <p className="max-w-2xl text-sm leading-[1.4] text-muted-foreground">
            How well LLMs solve nonogram puzzles. Compare accuracy, speed
            and cost across grid sizes.
          </p>
          <nav className="mt-2 flex gap-2 overflow-x-auto whitespace-nowrap" aria-label="Site navigation">
            <Button variant="outline" render={<Link href="/how-it-works" />}><Question size={16} />How it works</Button>
            <Button variant="outline" render={<Link href="/puzzles" />}><Rows size={16} />Explore puzzles</Button>
            <Button variant="outline" render={<Link href="/puzzles/overview" />}><GridFour size={16} />Puzzle insights</Button>
            <Button variant="outline" render={<a href="/results-raw.json" download />}><DownloadSimple size={16} />Raw results</Button>
          </nav>
        </header>
        <main>
        <div
          role="group"
          aria-label="Leaderboard filters"
          className="mb-3 flex flex-wrap items-center gap-3"
        >
          {hasHardMode && (
            <>
              <Segmented
                label="Benchmark tier"
                value={isHard ? "hard" : "standard"}
                onChange={(value) => onFiltersChange({ size: value === "hard" ? HARD_SIZE : undefined })}
                options={[{ value: "standard", label: "v1.2 Standard" }, { value: "hard", label: "v1.2 Hard" }]}
              />
              <span className="mx-1 hidden h-6 w-px bg-border sm:block" aria-hidden="true" />
            </>
          )}
          <ModelsPopover filters={filters} change={onFiltersChange} sources={results.byModel} />
          <EffortToggle filters={filters} change={onFiltersChange} />
          {!isHard && <Select items={[{ value: "all", label: "All sizes" }, ...standardSizes.map((value) => ({ value, label: sizeLabel(value) }))]} value={size ?? "all"} onValueChange={(value) => onFiltersChange({ size: value && value !== "all" ? value : undefined })}>
            <SelectTrigger aria-label="Grid size"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All sizes</SelectItem>{standardSizes.map((value) => <SelectItem key={value} value={value}>{sizeLabel(value)}</SelectItem>)}</SelectContent>
          </Select>}
        </div>
        {isHard && <HardModeIntro />}
        <section className="mb-8">
          <Card ref={chartRef}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <CardTitle><h2 className="font-display text-2xl lowercase">model accuracy</h2></CardTitle>
                    <Popover>
                      <PopoverTrigger render={<Button variant="ghost" size="icon" aria-label="What do the thin lines mean?" />}><Info size={17} /></PopoverTrigger>
                      <PopoverContent side="bottom">The thin lines show 95% Wilson intervals. With 30 Standard puzzles, small score differences may not mean much.</PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" title={copyDone ? "Copied" : "Copy link"} aria-label={copyDone ? "Copied" : "Copy link"} onClick={copyLink}><Copy size={15} /></Button>
                    <Button variant="outline" size="icon" title="Download chart as PNG" aria-label="Download chart as PNG" onClick={downloadChart}><DownloadSimple size={15} /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
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
                        <div className="col-start-1 row-start-1 flex min-w-0 items-center gap-2 text-sm">
                          <ModelName model={model} />
                          {!model.complete && <IncompleteBadge model={model} size={size} />}
                        </div>
                        <Tooltip>
                          <TooltipTrigger
                            type="button"
                            aria-label={`${model.displayName}: ${value.accuracy.toFixed(1)}% accuracy, 95% interval ${(interval.low * 100).toFixed(0)} to ${(interval.high * 100).toFixed(0)}%; ${value.correct} of ${value.runs} correct; ${formatCost(perPuzzle ? value.cost / value.runs : value.cost, perPuzzle)} ${perPuzzle ? "cost per puzzle" : "total cost"}; ${formatDuration(perPuzzle ? value.time / value.runs : value.time)} ${perPuzzle ? "time per puzzle" : "total time"}`}
                            className="relative col-span-2 col-start-1 row-start-2 h-5 w-full rounded-sm bg-foreground/5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:col-span-1 sm:col-start-2 sm:row-start-1"
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
                              {perPuzzle ? "Cost / puzzle" : "Total cost"} {formatCost(perPuzzle ? value.cost / value.runs : value.cost, perPuzzle)} · {perPuzzle ? "Time / puzzle" : "Total time"}{" "}
                              {formatDuration(perPuzzle ? value.time / value.runs : value.time)}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                        <span className="col-start-2 row-start-1 text-right font-mono text-xs font-medium tabular-nums sm:col-start-3">
                          {value.accuracy.toFixed(1)}%{" "}
                          <span className="whitespace-nowrap text-muted-foreground">
                            ({(interval.low * 100).toFixed(0)}–{(interval.high * 100).toFixed(0)}%)
                          </span>
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-border pt-3 font-mono text-xs text-muted-foreground">
                  <span>{chosen.length} {allLevels ? "variants" : "models"} · {size ? shortSizeLabel(size) : "Standard"}</span>
                  <span>{familiesWithResults} models · {variantsWithResults} variants with solved results</span>
                  <span>Updated {new Date(results.timestamp).toLocaleDateString()}</span>
                </div>
              </CardContent>
          </Card>
        </section>
        {isHard && <HardModeMisses models={chosen} />}
        <AccuracyScatter
          models={chosen}
          size={size}
          metric={metric}
          onMetricChange={onMetricChange}
        />
        {!isHard && <EffortLadder models={results.byModel} filters={filters} />}
        <Card className="defer-render mt-8" aria-labelledby="details-heading">
          <CardHeader><div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle><h2 id="details-heading" className="font-display text-2xl lowercase">detailed model statistics</h2></CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Accuracy and usage for the selected tier.</p>
            </div>
            <ToggleGroup aria-label="Cost and time units" value={[String(perPuzzle)]} onValueChange={(next) => { if (next[0]) onPerPuzzleChange(next[0] === "true"); }} variant="outline" spacing={0}>
              {([false, true] as const).map((average) => (
                <ToggleGroupItem key={String(average)} value={String(average)}>
                  {average ? "Per puzzle" : "Totals"}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div></CardHeader>
          <CardContent>
            <Table className="min-w-[650px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 z-10 w-32 max-w-32 bg-card sm:w-56 sm:max-w-56">Model</TableHead>
                  <TableHead

                    aria-sort={
                      sort.key === "accuracy"
                        ? sort.desc
                          ? "descending"
                          : "ascending"
                        : "none"
                    }
                  >
                    {sortButton(
                      size ? `${shortSizeLabel(size)} accuracy` : "Standard accuracy",
                      "accuracy",
                    )}
                    <span className="block text-xs font-normal text-muted-foreground">
                      95% interval
                    </span>
                  </TableHead>
                  {displayedSizes.map((value) => (
                    <TableHead key={value}>
                      {shortSizeLabel(value)}
                    </TableHead>
                  ))}
                  <TableHead

                    aria-sort={
                      sort.key === "cost"
                        ? sort.desc
                          ? "descending"
                          : "ascending"
                        : "none"
                    }
                  >
                    {sortButton(perPuzzle ? "Cost / puzzle" : "Total cost", "cost")}
                  </TableHead>
                  <TableHead

                    aria-sort={
                      sort.key === "time"
                        ? sort.desc
                          ? "descending"
                          : "ascending"
                        : "none"
                    }
                  >
                    {sortButton(perPuzzle ? "Time / puzzle" : "Total time", "time")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((model) => {
                  const value = chartStats(model, size);
                  const interval = wilsonInterval(value.correct, value.runs);
                  return (
                    <TableRow key={model.model}>
                      <TableCell className="sticky left-0 z-10 w-32 max-w-32 bg-card sm:w-56 sm:max-w-56">
                        <div className="flex items-center gap-2">
                          <ModelName model={model} />
                          {!model.complete && <IncompleteBadge model={model} size={size} />}
                        </div>
                      </TableCell>
                      <TableCell><span className="font-mono text-foreground">
                        {value.accuracy.toFixed(1)}%{" "}
                        <span className="block whitespace-nowrap text-xs text-muted-foreground sm:inline sm:text-xs">
                          ({(interval.low * 100).toFixed(0)}–{(interval.high * 100).toFixed(0)}%)
                        </span></span>
                      </TableCell>
                      {displayedSizes.map((grid) => {
                        const entry = model.bySize.find(
                          (row) => row.size === grid && row.runs > 0,
                        );
                        return (
                          <TableCell key={grid}>
                            <span className="font-mono text-muted-foreground">{entry ? `${entry.accuracy.toFixed(0)}%` : "—"}</span>
                          </TableCell>
                        );
                      })}
                      <TableCell><span className="font-mono text-muted-foreground">
                        {formatCost(perPuzzle ? value.cost / value.runs : value.cost, perPuzzle)}
                      </span></TableCell>
                      <TableCell><span className="font-mono text-muted-foreground">
                        {formatDuration(perPuzzle ? value.time / value.runs : value.time)}
                      </span></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <section className="defer-render mt-8" aria-labelledby="grid-stats-heading">
          <h2 id="grid-stats-heading" className="font-display text-2xl lowercase">statistics by grid size</h2>
          <p className="text-sm text-muted-foreground">Combined results for the models shown.</p>
          <div className={`mt-5 grid gap-4 sm:grid-cols-2 ${displayedSizes.length === 3 ? "xl:grid-cols-3" : "xl:grid-cols-4"}`}>
            {displayedSizes.map((grid, index) => {
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
                      <Badge variant="outline"><span className="size-2 rounded-full" style={{ backgroundColor: color }} />{sizeLabel(grid)}</Badge>
                      <span className="ml-3 text-sm font-normal text-muted-foreground">
                        {entries.length} {allLevels ? "variants" : "models"}
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
                      <span>{formatCost(totalCost / runs, true)} avg cost</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
        </main>
        <footer className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-8 text-sm text-muted-foreground">
          <span className="flex flex-col gap-1">
            <span>Nonobench · Nonogram puzzle benchmark for LLMs</span>
            <span className="text-xs">
              a side quest by{" "}
              <a
                href="https://www.mauricekleine.com/"
                className="inline-flex min-h-11 items-center hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                maurice kleine
              </a>
            </span>
          </span>
          <span className="flex gap-5">
            <a
              href="https://github.com/mauricekleine/nonobench"
              className="inline-flex min-h-11 items-center gap-1 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <GithubLogo size={16} />
              GitHub
            </a>
            <a
              href="https://x.com/mauricekleine"
              className="inline-flex min-h-11 items-center gap-1 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
