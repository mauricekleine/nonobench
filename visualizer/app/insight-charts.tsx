"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Info } from "@phosphor-icons/react";
import { ProviderLogo } from "@/components/provider-logos/provider-logo";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  chartStats,
  logTicks,
  effortInsight,
  effortLadders,
  effortRowDomain,
  scatterFrontier,
  scatterPoints,
  type ChartVariant,
  type EffortGroup,
  type XMetric,
} from "@/lib/chart-data";
import { EFFORT_ORDER, effortRank } from "@/lib/insights";
import { effortDescription, effortLabel, effortTitle } from "@/lib/display";
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
const logTickLabel = (value: number, metric: XMetric) => {
  if (metric === "cost") return `$${value}`;
  if (metric === "tokens")
    return value >= 1_000_000
      ? `${value / 1_000_000}m`
      : value >= 1_000
        ? `${value / 1_000}k`
        : `${value}`;
  const seconds = value / 1000;
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}m${remainder ? ` ${remainder}s` : ""}`;
};
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
  const scale = logTicks(lower, upper);
  const ticks = scale.length ? scale : [{ value: Math.sqrt(lower * upper), major: true }];
  // Place frontier labels beside their point, choosing the least crowded side.
  // Labels are anchored on the point and nudged by a few pixels, so they stay
  // attached to their dot at any chart width; the % boxes below are only an
  // approximate footprint for collision scoring.
  const LABEL_W = 11, LABEL_H = 6, GAP = 1;
  const occupied: { left: number; right: number; top: number; bottom: number }[] = [];
  const labelPositions = new Map<string, { left: string; top: string; transform: string }>();
  for (const point of frontier) {
    const px = xPosition(point.x), py = yPosition(point.y);
    const candidates = [
      { transform: "translate(10px, -50%)", box: { left: px + GAP, top: py - LABEL_H / 2 } },
      { transform: "translate(calc(-100% - 10px), -50%)", box: { left: px - GAP - LABEL_W, top: py - LABEL_H / 2 } },
      { transform: "translate(-50%, calc(-100% - 10px))", box: { left: px - LABEL_W / 2, top: py - GAP - LABEL_H } },
      { transform: "translate(-50%, 10px)", box: { left: px - LABEL_W / 2, top: py + GAP } },
    ];
    const score = ({ box }: (typeof candidates)[number]) => {
      const right = box.left + LABEL_W, bottom = box.top + LABEL_H;
      let penalty = box.left < 0 || right > 100 || box.top < 0 || bottom > 100 ? 100 : 0;
      penalty += points.filter((other) => other.id !== point.id && xPosition(other.x) >= box.left && xPosition(other.x) <= right && yPosition(other.y) >= box.top && yPosition(other.y) <= bottom).length * 8;
      penalty += occupied.filter((other) => box.left < other.right && right > other.left && box.top < other.bottom && bottom > other.top).length * 12;
      return penalty;
    };
    const best = [...candidates].sort((a, b) => score(a) - score(b))[0];
    occupied.push({ ...best.box, right: best.box.left + LABEL_W, bottom: best.box.top + LABEL_H });
    labelPositions.set(point.id, { left: `${px}%`, top: `${py}%`, transform: best.transform });
  }
  const hovered = points.find((point) => point.id === hoveredId);

  return (
    <section className={sectionClass} aria-labelledby="scatter-heading">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="scatter-heading" className={headingClass}>
            accuracy vs {metric}
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
          <div className="mt-5 flex items-center justify-between text-sm text-muted-foreground">
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
              {ticks.map((tick) => (
                <line
                  key={`x${tick.value}`}
                  x1={xPosition(tick.value)}
                  x2={xPosition(tick.value)}
                  y1="0"
                  y2="100"
                  stroke="var(--muted-foreground)"
                  strokeOpacity={tick.major ? 0.35 : 0.14}
                  strokeWidth="1"
                  strokeDasharray={tick.major ? undefined : "3 4"}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              {[0, 25, 50, 75, 100].map((value) => (
                <line
                  key={`y${value}`}
                  x1="0"
                  x2="100"
                  y1={yPosition(value)}
                  y2={yPosition(value)}
                  stroke="var(--muted-foreground)"
                  strokeOpacity={value % 50 === 0 ? 0.3 : 0.14}
                  strokeWidth="1"
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
            {[100, 75, 50, 25, 0].map((value) => (
              <span
                key={value}
                className="absolute left-1.5 bg-card px-0.5 font-mono text-xs text-muted-foreground sm:text-[13px]"
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
                      aria-label={`${point.model.displayName}, ${effortDescription(point.model.effort)}, ${point.y.toFixed(1)}% accuracy, ${metricValue(point.x, metric)} per puzzle`}
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
                        {effortDescription(point.model.effort)} · {point.y.toFixed(1)}%
                        accuracy
                      </p>
                      {effortTitle(point.model.effort) && <p>{effortTitle(point.model.effort)}</p>}
                      <p>{metricValue(point.x, metric)} per puzzle</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              );
            })}
            {frontier.map((point) => <span key={`label-${point.id}`} className={`pointer-events-none absolute z-10 max-w-[150px] whitespace-nowrap items-center gap-1 rounded border border-border/60 bg-card px-1 py-0.5 text-[10px] leading-tight text-foreground sm:flex ${mobileLabelIds.has(point.id) ? "flex" : "hidden"}`} style={{ ...labelPositions.get(point.id), opacity: activeFamily && activeFamily !== point.model.family ? 0.25 : 1 }}><ProviderLogo provider={point.model.provider} size={12} className="shrink-0" /><span className="truncate">{point.model.familyDisplayName}</span></span>)}
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
                  {effortDescription(hovered.model.effort)} · {hovered.y.toFixed(1)}%
                  accuracy
                </div>
                {effortTitle(hovered.model.effort) && <div>{effortTitle(hovered.model.effort)}</div>}
                <div>{metricValue(hovered.x, metric)} per puzzle</div>
              </div>
            )}
          </div>
          <div className="relative mt-1.5 h-6 font-mono text-xs text-muted-foreground sm:text-[13px]">
            {ticks.map((tick) => (
              <span
                key={tick.value}
                className={`absolute -translate-x-1/2 whitespace-nowrap ${tick.major ? "text-foreground" : "hidden text-dim sm:inline"}`}
                style={{ left: `${xPosition(tick.value)}%` }}
              >
                {logTickLabel(tick.value, metric)}
              </span>
            ))}
          </div>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            {metricLabels[metric]} → <span className="text-dim">(log scale: each solid line is 10× the last)</span>
          </p>
          {points.length < models.length && (
            <p className="mt-1 text-center font-mono text-[10px] text-dim">
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
                  <td title={effortTitle(point.model.effort)}>{effortLabel(point.model.effort)}</td>
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

// Spread every effort level evenly between 8% and 92% of the row.
const ladderX = (rank: number) => 8 + rank * (84 / (EFFORT_ORDER.length - 1));

function LadderRow({ group, size }: { group: EffortGroup<ChartVariant>; size?: string }) {
  const first = group.variants[0];
  const color = colorFor(first.provider);
  const domain = effortRowDomain(group, size);
  const levels = group.kind === "reasoning" ? ["off", "on"] : [...EFFORT_ORDER.map(effortLabel)];
  const xPosition = (model: ChartVariant) => group.kind === "reasoning"
    ? model.effort === "none" ? 12 : 88
    : ladderX(effortRank(model.effort));
  const yPosition = (accuracy: number) => 70 - 35 * (accuracy - domain.low) / (domain.high - domain.low);
  const line = group.variants.map((model, index) => `${index ? "L" : "M"} ${xPosition(model)} ${yPosition(chartStats(model, size).accuracy)}`).join(" ");
  return <div className="relative h-44 min-w-0 rounded-lg border border-border/70 bg-background/35 p-3" role="group" aria-label={`${first.familyDisplayName} ${group.kind === "reasoning" ? "reasoning off to on" : "effort ladder"}`}>
    <div className="flex min-w-0 items-center gap-2 text-sm font-medium"><ProviderLogo provider={first.provider} size={15} className="shrink-0" /><span className="truncate" title={first.familyDisplayName}>{first.familyDisplayName}</span></div>
    <div className="relative mt-1 h-[116px]">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {levels.map((_, index) => { const x = group.kind === "reasoning" ? index ? 88 : 12 : ladderX(index); return <line key={index} x1={x} x2={x} y1="15" y2="84" stroke="var(--border)" strokeWidth="0.12" vectorEffect="non-scaling-stroke" />; })}
        <path d={line} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
      {group.variants.map((model) => {
        const value = chartStats(model, size), x = xPosition(model), y = yPosition(value.accuracy);
        return <div key={model.model}>
          <span aria-hidden="true" className="pointer-events-none absolute -translate-x-1/2 -translate-y-full whitespace-nowrap rounded bg-background/80 px-0.5 font-mono text-[10px] tabular-nums" style={{ left: `${x}%`, top: `calc(${y}% - 9px)` }}>{value.correct}/{value.runs}</span>
          <Tooltip><TooltipTrigger type="button" className="absolute flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-ember-bright" style={{ left: `${x}%`, top: `${y}%` }} aria-label={`${model.familyDisplayName}, ${effortLabel(model.effort)}, ${value.correct} of ${value.runs} solved`}><span className="size-[10px] rounded-full border-2 border-card" style={{ backgroundColor: color }} /></TooltipTrigger><TooltipContent>{model.familyDisplayName} · {effortLabel(model.effort)}: {value.accuracy.toFixed(1)}% ({value.correct}/{value.runs} solved)</TooltipContent></Tooltip>
        </div>;
      })}
      {group.variants.slice(1).map((model, index) => {
        const previous = group.variants[index];
        const delta = chartStats(model, size).correct - chartStats(previous, size).correct;
        const x = (xPosition(previous) + xPosition(model)) / 2;
        const y = (yPosition(chartStats(previous, size).accuracy) + yPosition(chartStats(model, size).accuracy)) / 2;
        return <span key={model.model} aria-hidden="true" className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded border border-border bg-card px-1 font-mono text-[10px] tabular-nums" style={{ left: `${x}%`, top: `${y}%` }}>{delta > 0 ? `+${delta}` : delta < 0 ? `−${-delta}` : "0"}</span>;
      })}
      {levels.map((level, index) => <span key={level} className="absolute bottom-0 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] text-muted-foreground" style={{ left: `${group.kind === "reasoning" ? index ? 88 : 12 : ladderX(index)}%` }}>{level}</span>)}
    </div>
  </div>;
}

export function EffortLadder({
  models,
  filters,
}: {
  models: ChartVariant[];
  filters: Filters;
}) {
  const ladders = effortLadders(models, { ...filters, minCorrect: 0 });
  const ordered = ladders.filter((group) => group.kind === "ordered");
  const reasoning = ladders.filter((group) => group.kind === "reasoning");
  const size = filters.size;
  const insight = effortInsight(ladders, size);
  return (
    <section className={sectionClass} aria-labelledby="effort-heading">
      <h2 id="effort-heading" className={headingClass}>
        effort ladder
      </h2>
      <p className="mt-2 text-sm text-foreground">
        {insight}{insight.endsWith(".") ? "" : "."}
      </p>
      <Popover>
        <PopoverTrigger type="button" aria-label="About effort ladders" className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground focus-visible:outline-2 focus-visible:outline-ember-bright"><Info size={14} /> How to read</PopoverTrigger>
        <PopoverContent>Every card shares the same effort axis, with its own score scale. Labels above the dots show puzzles solved, and the numbers between them show the change. The ladder always shows every measured level. “On” uses the provider’s default.</PopoverContent>
      </Popover>
      {ordered.length > 0 && <div className="mt-5 grid min-w-0 gap-3 lg:grid-cols-2">{ordered.map((group) => <LadderRow key={group.variants[0].family} group={group} size={size} />)}</div>}
      {reasoning.length > 0 && <div className="mt-7"><h3 className="mb-3 text-sm font-medium text-foreground">Reasoning off → on</h3><div className="grid min-w-0 gap-3 lg:grid-cols-2">{reasoning.map((group) => <LadderRow key={group.variants[0].family} group={group} size={size} />)}</div></div>}
      {!ladders.length && (
        <p className="py-8 text-sm text-muted-foreground">
          No families with comparable levels match these filters.
        </p>
      )}
      <details className="mt-5 border-t border-border pt-3 text-sm">
        <summary className="cursor-pointer text-ember focus-visible:outline-2 focus-visible:outline-ember-bright">
          View effort data table
        </summary>
        <div className="mt-3 max-h-96 overflow-auto">
          <table className="w-full min-w-[400px] text-left text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2">Family</th>
                <th>Level</th>
                <th>Accuracy</th>
                <th>Solved</th>
              </tr>
            </thead>
            <tbody>
              {ladders.flatMap((group) =>
                group.variants.map((model) => {
                  const value = chartStats(model, size);
                  return (
                    <tr key={model.model} className="border-b border-border/50">
                      <td className="py-2">{model.familyDisplayName}</td>
                      <td title={effortTitle(model.effort)}>
                        {group.kind === "reasoning"
                          ? model.effort === "none"
                            ? "off"
                            : "on"
                          : effortLabel(model.effort)}
                      </td>
                      <td>{value.accuracy.toFixed(1)}%</td>
                      <td>
                        {value.correct}/{value.runs}
                      </td>
                    </tr>
                  );
                }),
              )}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
