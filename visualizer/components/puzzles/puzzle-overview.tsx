"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { NonobenchMark } from "@/components/nonobench-mark";
import { ProviderLogo } from "@/components/provider-logos/provider-logo";
import { PUZZLES } from "@/components/puzzles";
import { shapeHeatmap, type HeatmapState } from "@/lib/puzzle-insights";
import { PROVIDERS } from "@/lib/providers";
import { PuzzleFilters, usePuzzleExport, usePuzzleFilters } from "./puzzle-filters";

const sizes = ["5x5", "10x10", "15x15", "20x20"];
const stateText: Record<HeatmapState, string> = { solved: "Solved", wrong: "Wrong answer", "cut-off": "Cut off", "not-run": "Not run" };
const stateClass: Record<HeatmapState, string> = {
  solved: "bg-[#46FEA5] text-[#07160d] font-bold",
  wrong: "border-2 border-[#FFCA16] text-[#FFCA16] font-bold",
  "cut-off": "bg-[repeating-linear-gradient(45deg,transparent,transparent_3px,#D871A1_3px,#D871A1_5px)] text-white font-bold",
  "not-run": "border border-border text-muted-foreground",
};

function Thumbnail({ index, size }: { index: number; size: number }) {
  const bits = PUZZLES[index].solution.replace(/\s/g, "");
  return <div aria-hidden="true" className="grid shrink-0 gap-px rounded-sm border border-foreground/40 bg-foreground/15 p-px" style={{ gridTemplateColumns: `repeat(${size}, 1fr)`, width: 44, height: 44 }}>
    {[...bits].map((bit, i) => <span key={i} className={bit === "1" ? "bg-foreground" : "bg-background"} />)}
  </div>;
}

export function PuzzleOverview() {
  const { filters, models, change, params } = usePuzzleFilters();
  const { data, error } = usePuzzleExport();
  const [rowDirection, setRowDirection] = useState<"high" | "low">("high");
  const [columnDirection, setColumnDirection] = useState<"hard" | "easy">("hard");
  const [activeCell, setActiveCell] = useState<string | null>(null);
  const ranked = useMemo(() => [...(data?.puzzles ?? [])].sort((a, b) => a.attempts === 0 ? 1 : b.attempts === 0 ? -1 : a.solveRate - b.solveRate || a.index - b.index), [data]);
  // Tiers nobody has run yet (e.g. 20x20 before its first runs) stay out of the heatmap.
  const runSizes = useMemo(() => sizes.filter((size) => (data?.puzzles ?? []).some((puzzle) => puzzle.size === size && puzzle.attempts > 0)), [data]);
  const columns = useMemo(() => runSizes.flatMap((size) => (data?.puzzles ?? []).filter((puzzle) => puzzle.size === size).sort((a, b) => columnDirection === "hard" ? a.solveRate - b.solveRate || a.index - b.index : b.solveRate - a.solveRate || a.index - b.index)), [data, runSizes, columnDirection]);
  const rows = useMemo(() => rowDirection === "high" ? models : [...models].reverse(), [models, rowDirection]);
  const heatmap = useMemo(() => shapeHeatmap(columns, rows.map((model) => model.model)), [columns, rows]);
  const activeKey = activeCell && rows.some((model) => columns.some((puzzle) => `${model.model}:${puzzle.index}` === activeCell)) ? activeCell : `${rows[0]?.model}:${columns[0]?.index}`;
  const filterQuery = params.toString();
  return <div className="relative min-h-screen overflow-x-clip bg-background text-foreground"><div className="noise-overlay" /><div className="fixed inset-0 grid-pattern pointer-events-none" /><div className="fixed inset-0 atmosphere pointer-events-none" />
    <header className="relative border-b border-border bg-card/50"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6"><div className="flex items-center gap-3"><NonobenchMark size="sm" /><div><h1 className="font-display text-xl font-semibold lowercase tracking-tight">puzzle insights</h1><p className="text-sm text-muted-foreground">Where models solve, miss, and run out of time</p></div></div><nav className="flex gap-4 text-sm"><Link href="/puzzles" className="text-ember underline focus-visible:outline-2 focus-visible:outline-ember">Open explorer</Link><Link href="/" className="text-muted-foreground underline focus-visible:outline-2 focus-visible:outline-ember">Results</Link></nav></div></header>
    <main className="relative mx-auto max-w-7xl space-y-10 px-4 py-8 sm:px-6">
      <section aria-labelledby="ranking-title"><div className="mb-4"><h2 id="ranking-title" className="font-display text-2xl font-semibold tracking-tight">Puzzles by difficulty</h2><p className="mt-1 max-w-2xl text-sm text-muted-foreground">Fewest models solved first. Rate counts every attempted model variant.</p></div>
        {error ? <p role="alert">Could not load puzzle results. Refresh to try again.</p> : !data ? <p role="status">Loading puzzle results…</p> : <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 lg:grid-cols-4">{ranked.map((puzzle) => <Link key={puzzle.id} href={`/puzzles?puzzle=${puzzle.index}${filterQuery ? `&${filterQuery}` : ""}`} className="group flex min-w-0 items-center gap-3 rounded-lg border border-border bg-card/75 p-2.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember hover:border-foreground/40"><Thumbnail index={puzzle.index} size={puzzle.width} /><div className="min-w-0"><div className="flex items-baseline gap-2"><span className="font-mono text-sm font-semibold">#{puzzle.index + 1}</span><span className="font-mono text-xs text-muted-foreground">{puzzle.width}×{puzzle.height}</span></div><div className="text-sm font-semibold" style={{ color: puzzle.attempts ? "#FFCA16" : "#C69CFF" }}>{puzzle.attempts ? `${Math.round(puzzle.solveRate * 100)}% solved` : "Not run yet"}</div><div className="flex flex-wrap gap-1 text-[10px] text-muted-foreground">{puzzle.multipleSolutions && <span className="rounded border border-border px-1">Multiple solutions</span>}{!puzzle.lineSolvable && <span className="rounded border border-border px-1">Needs more than line logic</span>}</div></div></Link>)}</div>}
      </section>
      <section aria-labelledby="heatmap-title"><div className="mb-4"><h2 id="heatmap-title" className="font-display text-2xl font-semibold tracking-tight">Every model, every puzzle</h2><p className="mt-1 text-sm text-muted-foreground">Select a cell to inspect the model’s answer against the clues.</p></div>
        <PuzzleFilters filters={filters} change={change} count={models.length} />
        <p className="mt-2 text-xs text-muted-foreground">Filters apply to the heatmap; puzzle solve rates always count every model variant.</p>
        <div className="my-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground" aria-label="Heatmap legend">{(["solved", "wrong", "cut-off", "not-run"] as const).map((state) => <span key={state} className="flex items-center gap-2"><span aria-hidden="true" className={`flex size-5 items-center justify-center rounded-sm ${stateClass[state]}`}>{state === "solved" ? "✓" : state === "wrong" ? "×" : state === "cut-off" ? "∕" : "·"}</span>{stateText[state]}</span>)}</div>
        <div className="mb-2 flex flex-wrap gap-3 text-xs"><button className="text-ember underline focus-visible:outline-2 focus-visible:outline-ember" onClick={() => setRowDirection(rowDirection === "high" ? "low" : "high")}>Rows: {rowDirection === "high" ? "highest score first" : "lowest score first"}</button><button className="text-ember underline focus-visible:outline-2 focus-visible:outline-ember" onClick={() => setColumnDirection(columnDirection === "hard" ? "easy" : "hard")}>Columns: {columnDirection === "hard" ? "hardest first" : "easiest first"} within size</button></div>
        {data && <div className="max-w-full overflow-x-auto scroll-pl-48 rounded-lg border border-border bg-card/80" role="region" aria-label="Scrollable model by puzzle heatmap; use arrow keys, Home and End between cells" onKeyDown={(event) => {
          if (!(event.target instanceof HTMLElement) || !event.target.hasAttribute("data-heat-cell")) return;
          const row = Number(event.target.dataset.row);
          const column = Number(event.target.dataset.column);
          const nextPosition = event.key === "ArrowLeft" ? [row, column - 1] : event.key === "ArrowRight" ? [row, column + 1] : event.key === "ArrowUp" ? [row - 1, column] : event.key === "ArrowDown" ? [row + 1, column] : event.key === "Home" ? [row, 0] : event.key === "End" ? [row, columns.length - 1] : null;
          if (!nextPosition) return;
          const [nextRow, nextColumn] = nextPosition;
          if (nextRow < 0 || nextRow >= rows.length || nextColumn < 0 || nextColumn >= columns.length) return;
          const container = event.currentTarget;
          const next = container.querySelector<HTMLElement>(`[data-heat-cell][data-row="${nextRow}"][data-column="${nextColumn}"]`);
          if (next) {
            event.preventDefault();
            next.focus({ preventScroll: true });
            next.scrollIntoView({ block: "nearest", inline: "nearest" });
            const stickyWidth = container.querySelector("thead th")?.getBoundingClientRect().width ?? 176;
            const leftEdge = container.getBoundingClientRect().left + stickyWidth + 8;
            const rightEdge = container.getBoundingClientRect().right - 8;
            const cell = next.getBoundingClientRect();
            if (cell.left < leftEdge) container.scrollLeft -= leftEdge - cell.left;
            else if (cell.right > rightEdge) container.scrollLeft += cell.right - rightEdge;
          }
        }}><table className="border-separate border-spacing-1 text-xs"><thead><tr><th className="sticky left-0 z-20 min-w-44 bg-card p-2 text-left">Model</th>{runSizes.map((size) => <th key={size} colSpan={columns.filter((puzzle) => puzzle.size === size).length} className="border-b border-border py-2 text-center font-mono">{size}</th>)}</tr><tr><th className="sticky left-0 z-20 bg-card" /><>{columns.map((puzzle) => <th key={puzzle.id} className="min-w-7 font-mono font-normal text-muted-foreground"><Link href={`/puzzles?puzzle=${puzzle.index}${filterQuery ? `&${filterQuery}` : ""}`} tabIndex={-1} className="focus-visible:outline-2 focus-visible:outline-ember" title={`Puzzle ${puzzle.index + 1}, ${Math.round(puzzle.solveRate * 100)}% solved`}>{puzzle.index + 1}</Link></th>)}</></tr></thead><tbody>{heatmap.map((row, rowIndex) => { const model = rows[rowIndex]; return <tr key={row.model}><th scope="row" className="sticky left-0 z-10 max-w-52 bg-card py-1 pr-2 text-left"><span className="flex items-center gap-2 truncate" style={{ color: PROVIDERS[model.provider]?.color }}><ProviderLogo provider={model.provider} size={14} /><span className="truncate text-foreground">{model.displayName}</span></span></th>{row.cells.map((cell, columnIndex) => <td key={cell.puzzle}><Link data-heat-cell data-row={rowIndex} data-column={columnIndex} tabIndex={activeKey === `${row.model}:${cell.puzzle}` ? 0 : -1} onFocus={() => setActiveCell(`${row.model}:${cell.puzzle}`)} href={`/puzzles?puzzle=${cell.puzzle}&model=${encodeURIComponent(row.model)}${filterQuery ? `&${filterQuery}` : ""}`} aria-label={`${model.displayName}, puzzle ${cell.puzzle + 1}: ${stateText[cell.state]}`} title={`${model.displayName} · puzzle ${cell.puzzle + 1}: ${stateText[cell.state]}`} className={`flex size-7 items-center justify-center rounded-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ember ${stateClass[cell.state]}`}>{cell.state === "solved" ? "✓" : cell.state === "wrong" ? "×" : cell.state === "cut-off" ? "∕" : "·"}</Link></td>)}</tr>; })}</tbody></table></div>}
      </section>
    </main>
  </div>;
}
