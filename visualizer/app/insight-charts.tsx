"use client";

import { useState } from "react";
import { ProviderLogo } from "@/components/provider-logos/provider-logo";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  chartStats,
  effortInsight,
  effortLadders,
  scatterFrontier,
  scatterPoints,
  type ChartVariant,
  type XMetric,
} from "@/lib/chart-data";
import { EFFORT_ORDER, effortRank } from "@/lib/insights";
import { type Filters } from "@/lib/leaderboard";
import { PROVIDERS } from "@/lib/providers";

const metricLabels: Record<XMetric, string> = {
  cost: "Cost per puzzle",
  time: "Time per puzzle",
  tokens: "Output tokens per puzzle",
};
const metricValue = (value: number, metric: XMetric) =>
  metric === "cost"
    ? value < 0.01
      ? `$${value.toFixed(4)}`
      : `$${value.toFixed(2)}`
    : metric === "time"
      ? `${(value / 1000).toFixed(1)}s`
      : `${Math.round(value).toLocaleString()} tokens`;
const colorFor = (provider: string) => PROVIDERS[provider]?.color ?? "#D8A46B";
const sectionClass = "mt-10 rounded-lg border border-border bg-card p-4 sm:p-6";
const headingClass = "font-display text-base font-medium lowercase";

export function AccuracyScatter({
  models,
  size,
  metric,
  onMetricChange,
}: {
  models: ChartVariant[];
  size?: string;
  metric: XMetric;
  onMetricChange: (metric: XMetric) => void;
}) {
  const [activeFamily, setActiveFamily] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const points = scatterPoints(models, size, metric);
  const frontier = scatterFrontier(models, size, metric);
  const frontierIds = new Set(frontier.map((point) => point.id));
  const mobileLabelIds = new Set([
    frontier[0]?.id,
    frontier[Math.floor(frontier.length / 2)]?.id,
    frontier[frontier.length - 1]?.id,
  ]);
  const min = Math.min(...points.map((point) => point.x));
  const max = Math.max(...points.map((point) => point.x));
  const lower = Number.isFinite(min) ? min / 1.25 : 1;
  const upper = Number.isFinite(max) ? max * 1.25 : 10;
  const xPosition = (x: number) =>
    5 +
    (90 * (Math.log(x) - Math.log(lower))) /
      (Math.log(upper) - Math.log(lower));
  const yPosition = (y: number) => 95 - y * 0.9;
  const path = frontier
    .map((point, index) =>
      index
        ? `H ${xPosition(point.x)} V ${yPosition(point.y)}`
        : `M ${xPosition(point.x)} ${yPosition(point.y)}`,
    )
    .join(" ");
  const ticks = [lower, Math.sqrt(lower * upper), upper];
  const hovered = points.find((point) => point.id === hoveredId);

  return (
    <section className={sectionClass} aria-labelledby="scatter-heading">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="scatter-heading" className={headingClass}>
            accuracy vs cost
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Each point is a model variant. The stepped line traces the best
            measured tradeoffs.
          </p>
        </div>
        <div
          role="group"
          aria-label="Horizontal axis"
          className="inline-flex max-w-full flex-wrap gap-1 rounded-md border border-border bg-background p-1"
        >
          {(["cost", "time", "tokens"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setHoveredId(null);
                setActiveFamily(null);
                onMetricChange(value);
              }}
              aria-pressed={metric === value}
              className={`rounded px-2 py-1.5 text-xs focus-visible:outline-2 focus-visible:outline-ember-bright ${metric === value ? "bg-ember text-background" : "text-muted-foreground hover:text-foreground"}`}
            >
              {metricLabels[value]}
            </button>
          ))}
        </div>
      </div>
      {points.length ? (
        <>
          <div className="mt-5 flex items-center justify-between text-xs text-muted-foreground">
            <span>Accuracy ↑</span>
            <span>↖ cheaper &amp; more accurate</span>
          </div>
          <div
            className="relative mt-2 h-[330px] border-b border-l border-border sm:h-[430px]"
            role="group"
            aria-label={`Scatter chart of accuracy versus ${metricLabels[metric].toLowerCase()}, logarithmic horizontal axis`}
            onPointerMove={(event) => {
              if (event.pointerType === "touch") return;
              const bounds = event.currentTarget.getBoundingClientRect();
              const x = event.clientX - bounds.left;
              const y = event.clientY - bounds.top;
              const closest = points.reduce<{
                id: string | null;
                distance: number;
              }>(
                (best, point) => {
                  const distance = Math.hypot(
                    x - (xPosition(point.x) * bounds.width) / 100,
                    y - (yPosition(point.y) * bounds.height) / 100,
                  );
                  return distance < best.distance
                    ? { id: point.id, distance }
                    : best;
                },
                { id: null, distance: 18 },
              );
              setHoveredId(closest.id);
              setActiveFamily(
                closest.id
                  ? (points.find((point) => point.id === closest.id)?.model
                      .family ?? null)
                  : null,
              );
            }}
            onPointerLeave={() => {
              setHoveredId(null);
              setActiveFamily(null);
            }}
          >
            <svg
              className="absolute inset-0 h-full w-full overflow-visible"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {[5, 50, 95].map((position) => (
                <line
                  key={`x${position}`}
                  x1={position}
                  x2={position}
                  y1="0"
                  y2="100"
                  stroke="var(--border)"
                  strokeWidth="0.12"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              {[5, 50, 95].map((position) => (
                <line
                  key={`y${position}`}
                  x1="0"
                  x2="100"
                  y1={position}
                  y2={position}
                  stroke="var(--border)"
                  strokeWidth="0.12"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              <path
                d={path}
                fill="none"
                stroke="var(--ember)"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
                opacity="0.8"
              />
            </svg>
            {[100, 50, 0].map((value) => (
              <span
                key={value}
                className="absolute left-1 font-mono text-[10px] text-muted-foreground"
                style={{
                  top: `${yPosition(value)}%`,
                  transform: "translateY(-50%)",
                }}
              >
                {value}%
              </span>
            ))}
            {points.map((point) => {
              const px = xPosition(point.x);
              const py = yPosition(point.y);
              const isFrontier = frontierIds.has(point.id);
              return (
                <div
                  key={point.id}
                  className="absolute"
                  style={{
                    left: `${px}%`,
                    top: `${py}%`,
                    zIndex:
                      activeFamily === point.model.family
                        ? 20
                        : isFrontier
                          ? 10
                          : 1,
                  }}
                >
                  <Tooltip>
                    <TooltipTrigger
                      type="button"
                      onFocus={() => setActiveFamily(point.model.family)}
                      onBlur={() => setActiveFamily(null)}
                      aria-label={`${point.model.displayName}, ${point.model.effort} effort, ${point.y.toFixed(1)}% accuracy, ${metricValue(point.x, metric)} per puzzle`}
                      className="pointer-events-none absolute -left-3 -top-3 flex size-6 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ember-bright"
                      style={{
                        opacity:
                          activeFamily && activeFamily !== point.model.family
                            ? 0.22
                            : 1,
                      }}
                    >
                      <span
                        className="size-[10px] rounded-full border-2 border-card sm:size-3"
                        style={{
                          backgroundColor: colorFor(point.model.provider),
                          boxShadow: `0 0 0 1px ${colorFor(point.model.provider)}`,
                        }}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <strong>{point.model.displayName}</strong>
                      <p>
                        {point.model.effort} effort · {point.y.toFixed(1)}%
                        accuracy
                      </p>
                      <p>{metricValue(point.x, metric)} per puzzle</p>
                    </TooltipContent>
                  </Tooltip>
                  {isFrontier && (
                    <span
                      className={`pointer-events-none absolute max-w-[110px] items-center gap-1 rounded bg-card/90 px-1 py-0.5 text-[10px] leading-tight text-foreground sm:flex ${mobileLabelIds.has(point.id) ? "flex" : "hidden"} ${px > 65 ? "right-1" : "left-1"} ${py > 80 ? "bottom-3" : "top-3"}`}
                      style={{
                        opacity:
                          activeFamily && activeFamily !== point.model.family
                            ? 0.25
                            : 1,
                      }}
                    >
                      <ProviderLogo
                        provider={point.model.provider}
                        size={12}
                        className="shrink-0"
                      />
                      <span className="truncate">
                        {point.model.familyDisplayName}
                      </span>
                    </span>
                  )}
                </div>
              );
            })}
            {hovered && (
              <div
                role="status"
                className="pointer-events-none absolute z-30 w-max max-w-[190px] rounded-md bg-foreground px-3 py-2 text-xs text-background shadow-lg"
                style={{
                  left:
                    xPosition(hovered.x) > 65
                      ? undefined
                      : `${xPosition(hovered.x)}%`,
                  right:
                    xPosition(hovered.x) > 65
                      ? `${100 - xPosition(hovered.x)}%`
                      : undefined,
                  top: `${yPosition(hovered.y)}%`,
                  transform:
                    yPosition(hovered.y) < 25
                      ? "translateY(12px)"
                      : "translateY(calc(-100% - 12px))",
                }}
              >
                <strong>{hovered.model.displayName}</strong>
                <div>
                  {hovered.model.effort} effort · {hovered.y.toFixed(1)}%
                  accuracy
                </div>
                <div>{metricValue(hovered.x, metric)} per puzzle</div>
              </div>
            )}
          </div>
          <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground">
            {ticks.map((tick, index) => (
              <span key={index}>{metricValue(tick, metric)}</span>
            ))}
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            {metricLabels[metric]} (log scale) →
          </p>
          {points.length < models.length && (
            <p className="mt-1 text-center text-xs text-muted-foreground">
              {models.length - points.length}{" "}
              {models.length - points.length === 1
                ? "variant has"
                : "variants have"}{" "}
              no positive recorded {metric} value and cannot appear on a log
              scale.
            </p>
          )}
        </>
      ) : (
        <p className="py-10 text-sm text-muted-foreground">
          No measured points match these filters.
        </p>
      )}
      <details className="mt-5 border-t border-border pt-3 text-sm">
        <summary className="cursor-pointer text-ember focus-visible:outline-2 focus-visible:outline-ember-bright">
          View scatter data table
        </summary>
        <div className="mt-3 max-h-96 overflow-auto">
          <table className="w-full min-w-[500px] text-left text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2">Model</th>
                <th>Effort</th>
                <th>Accuracy</th>
                <th>{metricLabels[metric]}</th>
                <th>Frontier</th>
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={point.id} className="border-b border-border/50">
                  <td className="py-2">{point.model.familyDisplayName}</td>
                  <td>{point.model.effort}</td>
                  <td>{point.y.toFixed(1)}%</td>
                  <td>{metricValue(point.x, metric)}</td>
                  <td>{frontierIds.has(point.id) ? "Yes" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}

export function EffortLadder({
  models,
  filters,
}: {
  models: ChartVariant[];
  filters: Filters;
}) {
  const ladders = effortLadders(models, filters);
  const size = filters.size;
  const efforts = [...EFFORT_ORDER, "default"];
  const xPosition = (effort: string) => 5 + effortRank(effort) * 10;
  const yPosition = (accuracy: number) => 88 - accuracy * 0.75;
  return (
    <section className={sectionClass} aria-labelledby="effort-heading">
      <h2 id="effort-heading" className={headingClass}>
        effort ladder
      </h2>
      <p className="mt-2 text-sm text-foreground">
        {effortInsight(ladders, size)}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        All measured effort levels are shown for each selected family, including
        when Effort is set to Best.
      </p>
      <p className="mt-2 text-xs text-muted-foreground">Accuracy ↑ (0–100%)</p>
      {ladders.length > 0 && (
        <div className="mt-5 min-w-0">
          <div className="relative h-6 font-mono text-[10px] text-muted-foreground">
            {efforts.map((effort) => (
              <span
                key={effort}
                className="absolute -translate-x-1/2"
                style={{ left: `${xPosition(effort)}%` }}
                title={effort}
              >
                <span className="sm:hidden">
                  {
                    (
                      {
                        none: "none",
                        minimal: "min",
                        low: "low",
                        medium: "med",
                        high: "high",
                        xhigh: "xh",
                        default: "def",
                      } as Record<string, string>
                    )[effort]
                  }
                </span>
                <span className="hidden sm:inline">{effort}</span>
              </span>
            ))}
          </div>
          {ladders.map((ladder) => {
            const color = colorFor(ladder[0].provider);
            const line = ladder
              .map(
                (model, index) =>
                  `${index ? "L" : "M"} ${xPosition(model.effort)} ${yPosition(chartStats(model, size).accuracy)}`,
              )
              .join(" ");
            const end = ladder[ladder.length - 1];
            return (
              <div
                key={ladder[0].family}
                className="relative h-16 min-w-0 border-t border-border/50"
                role="group"
                aria-label={`${ladder[0].familyDisplayName} effort ladder`}
              >
                <svg
                  className="absolute inset-0 h-full w-full"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  {efforts.map((effort) => (
                    <line
                      key={effort}
                      x1={xPosition(effort)}
                      x2={xPosition(effort)}
                      y1="0"
                      y2="100"
                      stroke="var(--border)"
                      strokeWidth="0.12"
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                  {[0, 50, 100].map((accuracy) => (
                    <line
                      key={accuracy}
                      x1="0"
                      x2="100"
                      y1={yPosition(accuracy)}
                      y2={yPosition(accuracy)}
                      stroke="var(--border)"
                      strokeWidth="0.12"
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                  <path
                    d={line}
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
                {ladder.map((model) => (
                  <Tooltip key={model.model}>
                    <TooltipTrigger
                      type="button"
                      className="absolute flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-ember-bright"
                      style={{
                        left: `${xPosition(model.effort)}%`,
                        top: `${yPosition(chartStats(model, size).accuracy)}%`,
                      }}
                      aria-label={`${model.familyDisplayName}, ${model.effort} effort, ${chartStats(model, size).accuracy.toFixed(1)}% accuracy`}
                    >
                      <span
                        className="size-[10px] rounded-full border-2 border-card"
                        style={{ backgroundColor: color }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      {model.familyDisplayName} · {model.effort}:{" "}
                      {chartStats(model, size).accuracy.toFixed(1)}%
                    </TooltipContent>
                  </Tooltip>
                ))}
                <span
                  className="absolute flex max-w-[28%] min-w-0 items-center gap-1 text-xs"
                  style={{
                    left: `${xPosition(end.effort) + 2}%`,
                    top: `${yPosition(chartStats(end, size).accuracy)}%`,
                    transform: "translateY(-50%)",
                  }}
                  title={ladder[0].familyDisplayName}
                >
                  <ProviderLogo
                    provider={ladder[0].provider}
                    size={13}
                    className="shrink-0"
                  />
                  <span className="truncate">
                    {ladder[0].familyDisplayName}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      )}
      <details className="mt-5 border-t border-border pt-3 text-sm">
        <summary className="cursor-pointer text-ember focus-visible:outline-2 focus-visible:outline-ember-bright">
          View effort data table
        </summary>
        <div className="mt-3 max-h-96 overflow-auto">
          <table className="w-full min-w-[360px] text-left text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2">Family</th>
                <th>Effort</th>
                <th>Accuracy</th>
              </tr>
            </thead>
            <tbody>
              {ladders.flatMap((ladder) =>
                ladder.map((model) => (
                  <tr key={model.model} className="border-b border-border/50">
                    <td className="py-2">{model.familyDisplayName}</td>
                    <td>{model.effort}</td>
                    <td>{chartStats(model, size).accuracy.toFixed(1)}%</td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}

export function SizeBreakdown({
  models,
  size,
}: {
  models: ChartVariant[];
  size?: string;
}) {
  const sizes = size
    ? [size]
    : ["5x5", "10x10", "15x15", "20x20"].filter((grid) =>
        models.some((model) =>
          model.bySize.some((entry) => entry.size === grid && entry.runs > 0),
        ),
      );
  return (
    <section className={sectionClass} aria-labelledby="size-heading">
      <h2 id="size-heading" className={headingClass}>
        accuracy by grid size
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Solved puzzles by model and grid size. Each bar spans 0–100%.
      </p>
      <div className="mt-4 space-y-1">
        {models.map((model) => (
          <div
            key={model.model}
            className="grid gap-2 border-b border-border/50 py-2 text-xs sm:grid-cols-[minmax(9rem,15rem)_minmax(0,1fr)] sm:items-center"
          >
            <span className="flex min-w-0 items-center gap-1">
              <ProviderLogo
                provider={model.provider}
                size={13}
                className="shrink-0"
              />
              <span className="truncate">{model.familyDisplayName}</span>
              <span className="shrink-0 font-mono text-[10px] text-dim">
                {model.effort}
              </span>
            </span>
            <div
              className="grid gap-1"
              style={{
                gridTemplateColumns: `repeat(${sizes.length || 1}, minmax(0, 1fr))`,
              }}
            >
              {sizes.map((grid) => {
                const entry = model.bySize.find(
                  (row) => row.size === grid && row.runs > 0,
                );
                return (
                  <div key={grid} className="min-w-0">
                    <div className="flex justify-between gap-1 font-mono text-[10px] text-muted-foreground">
                      <span>{grid}</span>
                      <span>
                        {entry ? `${entry.accuracy.toFixed(0)}%` : "—"}
                      </span>
                    </div>
                    <div className="mt-0.5 h-1.5 bg-foreground/5">
                      <div
                        className="h-full"
                        style={{
                          width: `${entry?.accuracy ?? 0}%`,
                          backgroundColor: colorFor(model.provider),
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {!models.length && (
        <p className="py-8 text-sm text-muted-foreground">
          No models match these filters.
        </p>
      )}
      <details className="mt-5 border-t border-border pt-3 text-sm">
        <summary className="cursor-pointer text-ember focus-visible:outline-2 focus-visible:outline-ember-bright">
          View size data table
        </summary>
        <div className="mt-3 max-h-96 overflow-auto">
          <table className="w-full min-w-[360px] text-left text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2">Model</th>
                {sizes.map((grid) => (
                  <th key={grid}>{grid}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {models.map((model) => (
                <tr key={model.model} className="border-b border-border/50">
                  <td className="py-2">
                    {model.familyDisplayName} ({model.effort})
                  </td>
                  {sizes.map((grid) => {
                    const entry = model.bySize.find(
                      (row) => row.size === grid && row.runs > 0,
                    );
                    return (
                      <td key={grid}>
                        {entry
                          ? `${entry.accuracy.toFixed(1)}% (${entry.correct}/${entry.runs})`
                          : "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
