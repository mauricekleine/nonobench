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
  const ranked = useMemo(() => [...(data?.puzzles ?? [])].sort((a, b) => a.attempts === 0 ? 1 : b.attempts === 0 ? -1 : a.solveRate - b.solveRate || a.index - b.index), [data]);
  // Tiers nobody has run yet (e.g. 20x20 before its first runs) stay out of the heatmap.
  const runSizes = useMemo(() => sizes.filter((size) => (data?.puzzles ?? []).some((puzzle) => puzzle.size === size && puzzle.attempts > 0)), [data]);
  const columns = useMemo(() => runSizes.flatMap((size) => (data?.puzzles ?? []).filter((puzzle) => puzzle.size === size).sort((a, b) => columnDirection === "hard" ? a.solveRate - b.solveRate || a.index - b.index : b.solveRate - a.solveRate || a.index - b.index)), [data, runSizes, columnDirection]);
  const rows = useMemo(() => rowDirection === "high" ? models : [...models].reverse(), [models, rowDirection]);
  const heatmap = useMemo(() => shapeHeatmap(columns, rows.map((model) => model.model)), [columns, rows]);
  const filterQuery = params.toString();
  return <div className="relative min-h-screen overflow-x-clip bg-background text-foreground"><div className="noise-overlay" /><div className="fixed inset-0 grid-pattern pointer-events-none" /><div className="fixed inset-0 atmosphere pointer-events-none" />
    <header className="relative border-b border-border bg-card/50"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6"><div className="flex items-center gap-3"><NonobenchMark size="sm" /><div><h1 className="font-display text-xl font-semibold lowercase tracking-tight">puzzle insights</h1><p className="text-sm text-muted-foreground">Where models solve, miss, and run out of time</p></div></div><nav className="flex gap-4 text-sm"><Link href="/puzzles" className="text-ember underline focus-visible:outline-2 focus-visible:outline-ember">Open explorer</Link><Link href="/" className="text-muted-foreground underline focus-visible:outline-2 focus-visible:outline-ember">Results</Link></nav></div></header>
    <main className="relative mx-auto max-w-7xl space-y-10 px-4 py-8 sm:px-6">
      <section aria-labelledby="ranking-title"><div className="mb-4"><h2 id="ranking-title" className="font-display text-2xl font-semibold tracking-tight">Puzzles by difficulty</h2><p className="mt-1 max-w-2xl text-sm text-muted-foreground">Fewest models solved first. Rate counts every attempted model variant.</p></div>
        {error ? <p role="alert">Could not load puzzle results. Refresh to try again.</p> : !data ? <p role="status">Loading puzzle results…</p> : <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 lg:grid-cols-4">{ranked.map((puzzle) => <Link key={puzzle.id} href={`/puzzles?puzzle=${puzzle.index}${filterQuery ? `&${filterQuery}` : ""}`} className="group flex min-w-0 items-center gap-3 rounded-lg border border-border bg-card/75 p-2.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember hover:border-foreground/40"><Thumbnail index={puzzle.index} size={puzzle.width} /><div className="min-w-0"><div className="flex items-baseline gap-2"><span className="font-mono text-sm font-semibold">#{puzzle.index + 1}</span><span className="font-mono text-xs text-muted-foreground">{puzzle.width}×{puzzle.height}</span></div><div className="text-sm font-semibold" style={{ color: puzzle.attempts ? "#FFCA16" : "#C69CFF" }}>{puzzle.attempts ? `${Math.round(puzzle.solveRate * 100)}% solved` : "Not run yet"}</div><div className="flex flex-wrap gap-1 text-[10px] text-muted-foreground">{puzzle.multipleSolutions && <span className="rounded border border-border px-1">Multiple solutions</span>}{!puzzle.lineSolvable && <span className="rounded border border-border px-1">Needs more than line logic</span>}</div></div></Link>)}</div>}
      </section>
      <section aria-labelledby="heatmap-title"><div className="mb-4"><h2 id="heatmap-title" className="font-display text-2xl font-semibold tracking-tight">Every model, every puzzle</h2><p className="mt-1 text-sm text-muted-foreground">Select a cell to inspect the model’s answer against the clues.</p></div>
        <PuzzleFilters filters={filters} change={change} count={models.length} />
        <div className="my-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground" aria-label="Heatmap legend">{(["solved", "wrong", "cut-off", "not-run"] as const).map((state) => <span key={state} className="flex items-center gap-2"><span aria-hidden="true" className={`flex size-5 items-center justify-center rounded-sm ${stateClass[state]}`}>{state === "solved" ? "✓" : state === "wrong" ? "×" : state === "cut-off" ? "∕" : "·"}</span>{stateText[state]}</span>)}</div>
        <div className="mb-2 flex flex-wrap gap-3 text-xs"><button className="text-ember underline focus-visible:outline-2 focus-visible:outline-ember" onClick={() => setRowDirection(rowDirection === "high" ? "low" : "high")}>Rows: {rowDirection === "high" ? "highest score first" : "lowest score first"}</button><button className="text-ember underline focus-visible:outline-2 focus-visible:outline-ember" onClick={() => setColumnDirection(columnDirection === "hard" ? "easy" : "hard")}>Columns: {columnDirection === "hard" ? "hardest first" : "easiest first"} within size</button></div>
        {data && <div className="max-w-full overflow-x-auto rounded-lg border border-border bg-card/80" role="region" aria-label="Scrollable model by puzzle heatmap; use arrow keys between cells" tabIndex={0} onKeyDown={(event) => {
          if (!(event.target instanceof HTMLElement) || !event.target.hasAttribute("data-heat-cell")) return;
          const direction = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -columns.length, ArrowDown: columns.length }[event.key];
          if (direction === undefined) return;
          const cells = [...event.currentTarget.querySelectorAll<HTMLElement>("[data-heat-cell]")];
          const current = cells.indexOf(event.target);
          if ((event.key === "ArrowLeft" && current % columns.length === 0) || (event.key === "ArrowRight" && current % columns.length === columns.length - 1)) return;
          const next = cells[current + direction];
          if (next) { event.preventDefault(); next.focus(); }
        }}><table className="border-separate border-spacing-1 text-xs"><thead><tr><th className="sticky left-0 z-20 min-w-44 bg-card p-2 text-left">Model</th>{runSizes.map((size) => <th key={size} colSpan={columns.filter((puzzle) => puzzle.size === size).length} className="border-b border-border py-2 text-center font-mono">{size}</th>)}</tr><tr><th className="sticky left-0 z-20 bg-card" /><>{columns.map((puzzle) => <th key={puzzle.id} className="min-w-7 font-mono font-normal text-muted-foreground"><Link href={`/puzzles?puzzle=${puzzle.index}`} className="focus-visible:outline-2 focus-visible:outline-ember" title={`Puzzle ${puzzle.index + 1}, ${Math.round(puzzle.solveRate * 100)}% solved`}>{puzzle.index + 1}</Link></th>)}</></tr></thead><tbody>{heatmap.map((row, rowIndex) => { const model = rows[rowIndex]; return <tr key={row.model}><th scope="row" className="sticky left-0 z-10 max-w-52 bg-card py-1 pr-2 text-left"><span className="flex items-center gap-2 truncate" style={{ color: PROVIDERS[model.provider]?.color }}><ProviderLogo provider={model.provider} size={14} /><span className="truncate text-foreground">{model.displayName}</span></span></th>{row.cells.map((cell) => <td key={cell.puzzle}><Link data-heat-cell href={`/puzzles?puzzle=${cell.puzzle}&model=${encodeURIComponent(row.model)}${filterQuery ? `&${filterQuery}` : ""}`} aria-label={`${model.displayName}, puzzle ${cell.puzzle + 1}: ${stateText[cell.state]}`} title={`${model.displayName} · puzzle ${cell.puzzle + 1}: ${stateText[cell.state]}`} className={`flex size-7 items-center justify-center rounded-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ember ${stateClass[cell.state]}`}>{cell.state === "solved" ? "✓" : cell.state === "wrong" ? "×" : cell.state === "cut-off" ? "∕" : "·"}</Link></td>)}</tr>; })}</tbody></table></div>}
      </section>
    </main>
  </div>;
}
