"use client";

import Link from "next/link";
import { ProviderLogo } from "@/components/provider-logos/provider-logo";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { effortLabel } from "@/lib/display";
import { PROVIDERS } from "@/lib/providers";
import resultsData from "./results.json";

type Outcome = "solved" | "wrong-grid" | "no-grid";
type Reason = "timed-out" | "cut-off" | "wrong-size" | "gave-up" | "empty" | "no-grid";
type HardRun = { puzzle: number; outcome: Outcome; cellsOff?: number; linesSatisfied?: number; reason?: Reason };
type HardModeData = { size: string; puzzles: number; models: { model: string; runs: HardRun[] }[] };
type Variant = { model: string; provider: string; effort: string; familyDisplayName: string };

const hardMode = (resultsData as unknown as { hardMode?: HardModeData }).hardMode;
const CELLS = 400;
const LINES = 40;
// Puzzles 1–5 fall to line logic; 6–10 need deeper deduction.
const LINE_SOLVABLE = 5;

const sectionClass = "mt-10 rounded-lg border border-border bg-card p-4 sm:p-6";
const headingClass = "font-display text-base font-medium lowercase";

const reasonText: Record<Reason, string> = {
  "gave-up": "gave up",
  "cut-off": "cut off",
  "timed-out": "timed out",
  "wrong-size": "wrong size",
  empty: "empty",
  "no-grid": "no grid",
};
const reasonDetail: Record<Reason, string> = {
  "gave-up": "Answered that the puzzle has no solution.",
  "cut-off": "Ran out of the 128,000-token answer budget.",
  "timed-out": "Cut off by the provider's time limit.",
  "wrong-size": "Returned a grid with the wrong number of cells.",
  empty: "Returned an empty answer.",
  "no-grid": "The answer didn't contain a grid.",
};

// One hue, lighter to stronger as the grid gets further from the solution.
// Solved and wrong cells also carry a ✓ or the cell count, so colour is never
// the only cue.
function wrongFill(cellsOff: number) {
  const share = cellsOff / CELLS;
  if (share <= 0.01) return "#FDBA74";
  if (share <= 0.1) return "#F97316";
  return "#D9480F";
}

function summary(runs: HardRun[]) {
  const solved = runs.filter((run) => run.outcome === "solved").length;
  const wrong = runs.filter((run) => run.outcome === "wrong-grid").map((run) => run.cellsOff ?? 0).sort((a, b) => a - b);
  const reasons = new Map<Reason, number>();
  for (const run of runs) if (run.reason) reasons.set(run.reason, (reasons.get(run.reason) ?? 0) + 1);
  const parts = [`${solved} solved`];
  if (wrong.length) {
    parts.push(
      wrong.length <= 3
        ? `${wrong.join(", ")} ${wrong.length === 1 && wrong[0] === 1 ? "cell" : "cells"} off`
        : `grids ${Math.round((100 * wrong[Math.floor(wrong.length / 2)]) / CELLS)}% off (median)`,
    );
  }
  for (const [reason, count] of [...reasons].sort((a, b) => b[1] - a[1])) parts.push(`${count} ${reasonText[reason]}`);
  return parts.join(" · ");
}

function rank(runs: HardRun[]) {
  const solved = runs.filter((run) => run.outcome === "solved").length;
  const wrong = runs.filter((run) => run.outcome === "wrong-grid").map((run) => run.cellsOff ?? CELLS);
  const median = wrong.length ? [...wrong].sort((a, b) => a - b)[Math.floor(wrong.length / 2)] : CELLS + 1;
  return { solved, grids: solved + wrong.length, median };
}

export function HardModeIntro() {
  return (
    <div className="mb-5 max-w-3xl space-y-2 text-sm leading-relaxed text-muted-foreground">
      <p>
        The Standard set stopped separating the best models: the top three
        solve 26 to 30 of its 30 puzzles. Hard mode adds ten 20×20 puzzles
        filled at random, so there is no picture to guess from. Every puzzle
        has exactly one solution, and five of them can&apos;t be solved one
        row or column at a time.
      </p>
      <p>
        Each model family runs Hard mode once, at the effort level that
        scored best on Standard when these runs were made. Answers are written
        one row per line, with a 128,000-token answer budget.{" "}
        <Link href="/how-it-works" className="text-ember underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-ember-bright">
          How it works
        </Link>
      </p>
    </div>
  );
}

export function HardModeMisses({ models }: { models: Variant[] }) {
  if (!hardMode) return null;
  const byModel = new Map(hardMode.models.map((entry) => [entry.model, entry.runs]));
  const rows = models
    .flatMap((model) => {
      const runs = byModel.get(model.model);
      return runs ? [{ model, runs, rank: rank(runs) }] : [];
    })
    .sort((a, b) =>
      b.rank.solved - a.rank.solved ||
      b.rank.grids - a.rank.grids ||
      a.rank.median - b.rank.median ||
      a.model.familyDisplayName.localeCompare(b.model.familyDisplayName),
    );
  if (!rows.length) return null;
  const puzzles = Array.from({ length: hardMode.puzzles }, (_, index) => index + 1);

  return (
    <section className={sectionClass} aria-labelledby="misses-heading">
      <h2 id="misses-heading" className={headingClass}>how close were the misses</h2>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        One square per puzzle. A wrong grid shows how many of its 400 cells
        differ from the solution; a random grid would get about half of them
        wrong.
      </p>

      <div className="mt-5 overflow-x-auto">
        <div className="min-w-[640px]">
          <div className="grid grid-cols-[minmax(10rem,14rem)_auto_minmax(12rem,1fr)] items-end gap-x-4 pb-2 text-[11px] text-dim">
            <span />
            <div className="flex gap-3">
              <span className="w-[calc(5*1.75rem+4*2px)] text-center">line logic</span>
              <span className="w-[calc(5*1.75rem+4*2px)] text-center">deeper deduction</span>
            </div>
            <span />
          </div>
          <ul className="space-y-1.5">
            {rows.map(({ model, runs }) => (
              <li key={model.model} className="grid grid-cols-[minmax(10rem,14rem)_auto_minmax(12rem,1fr)] items-center gap-x-4">
                <span className="flex min-w-0 items-center gap-1.5 text-sm">
                  <span className="shrink-0" style={{ color: PROVIDERS[model.provider]?.color }}>
                    <ProviderLogo provider={model.provider} size={15} />
                  </span>
                  <span className="truncate">{model.familyDisplayName}</span>
                  <span className="shrink-0 rounded border border-border px-1 font-mono text-[10px] text-muted-foreground">{effortLabel(model.effort)}</span>
                </span>
                <span className="flex gap-3">
                  {[puzzles.slice(0, LINE_SOLVABLE), puzzles.slice(LINE_SOLVABLE)].map((group) => (
                    <span key={group[0]} className="flex gap-[2px]">
                      {group.map((puzzle) => {
                        const run = runs.find((entry) => entry.puzzle === puzzle);
                        return <Square key={puzzle} puzzle={puzzle} run={run} />;
                      })}
                    </span>
                  ))}
                </span>
                <span className="text-xs text-muted-foreground">{summary(runs)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground" aria-label="Legend">
        <LegendSwatch fill="#46FEA5" label="solved" glyph="✓" />
        <LegendSwatch fill="#FDBA74" label="≤ 1% of cells off" glyph="2" />
        <LegendSwatch fill="#F97316" label="1–10% off" />
        <LegendSwatch fill="#D9480F" label="over 10% off" />
        <LegendSwatch fill="var(--color-foreground)" faint label="no grid (gave up, cut off, timed out…)" />
      </div>

      <details className="mt-5 border-t border-border pt-3 text-sm">
        <summary className="cursor-pointer text-ember focus-visible:outline-2 focus-visible:outline-ember-bright">
          View data table
        </summary>
        <div className="mt-3 max-h-96 overflow-auto">
          <table className="w-full min-w-[560px] text-left text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2">Model</th>
                <th>Effort</th>
                <th>Solved</th>
                <th>Complete grids</th>
                <th>Cells off (wrong grids)</th>
                <th>Clue lines satisfied (wrong grids)</th>
                <th>No grid</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ model, runs, rank: stats }) => {
                const wrong = runs.filter((run) => run.outcome === "wrong-grid");
                const lines = wrong.map((run) => run.linesSatisfied ?? 0);
                return (
                  <tr key={model.model} className="border-b border-border/50">
                    <td className="py-2">{model.familyDisplayName}</td>
                    <td>{effortLabel(model.effort)}</td>
                    <td>{stats.solved}/{runs.length}</td>
                    <td>{stats.grids}</td>
                    <td>{wrong.map((run) => run.cellsOff).sort((a, b) => (a ?? 0) - (b ?? 0)).join(", ") || "—"}</td>
                    <td>{lines.length ? `${Math.round((100 * lines.reduce((sum, value) => sum + value, 0)) / lines.length)}%` : "—"}</td>
                    <td>{runs.length - stats.grids}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}

function Square({ puzzle, run }: { puzzle: number; run?: HardRun }) {
  const base = "flex size-7 items-center justify-center rounded-[4px] font-mono text-[10px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ember-bright";
  const label = !run
    ? `Puzzle ${puzzle}: not run`
    : run.outcome === "solved"
      ? `Puzzle ${puzzle}: solved`
      : run.outcome === "wrong-grid"
        ? `Puzzle ${puzzle}: wrong grid, ${run.cellsOff} of ${CELLS} cells off`
        : `Puzzle ${puzzle}: ${reasonText[run.reason ?? "no-grid"]}`;
  const content = !run ? null
    : run.outcome === "solved"
      ? <span className={base} style={{ background: "#46FEA5", color: "#0B0D17" }}>✓</span>
      : run.outcome === "wrong-grid"
        ? <span className={base} style={{ background: wrongFill(run.cellsOff ?? CELLS), color: "#0B0D17" }}>{run.cellsOff}</span>
        : <span className={`${base} bg-foreground/10`} />;
  return (
    <Tooltip>
      <TooltipTrigger type="button" aria-label={label} className="rounded-[4px] focus-visible:outline-2 focus-visible:outline-ember-bright">
        {content ?? <span className={`${base} border border-dashed border-border`} />}
      </TooltipTrigger>
      <TooltipContent side="top">
        <strong>Puzzle {30 + puzzle}</strong>
        {run?.outcome === "solved" && <p>Solved.</p>}
        {run?.outcome === "wrong-grid" && (
          <>
            <p>{run.cellsOff} of {CELLS} cells differ from the solution ({((100 * (run.cellsOff ?? 0)) / CELLS).toFixed(1)}%).</p>
            <p>{Math.round((run.linesSatisfied ?? 0) * LINES)} of {LINES} clue lines satisfied.</p>
          </>
        )}
        {run?.outcome === "no-grid" && <p>{reasonDetail[run.reason ?? "no-grid"]}</p>}
        {!run && <p>Not run.</p>}
      </TooltipContent>
    </Tooltip>
  );
}

function LegendSwatch({ fill, label, glyph, faint }: { fill: string; label: string; glyph?: string; faint?: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className={`flex size-4 items-center justify-center rounded-[3px] font-mono text-[9px] font-semibold ${faint ? "bg-foreground/10" : ""}`}
        style={faint ? undefined : { background: fill, color: "#0B0D17" }}
      >
        {glyph}
      </span>
      {label}
    </span>
  );
}
