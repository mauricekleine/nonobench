"use client";

import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import Link from "next/link";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import { Suspense, useCallback, useEffect, useMemo } from "react";
import { NonobenchMark } from "@/components/nonobench-mark";
import { Nonogram } from "@/components/nonogram/nonogram";
import { PUZZLES } from "@/components/puzzles";
import { ProviderLogo } from "@/components/provider-logos/provider-logo";
import { PuzzleFilters, puzzleModel, usePuzzleExport, usePuzzleFilters } from "@/components/puzzles/puzzle-filters";
import { describeMissingAnswer, inspectAnswer, shortMissingAnswer, type PuzzleRun } from "@/lib/puzzle-insights";
import { effortLabel, formatDuration, sizeLabel } from "@/lib/display";
import { PROVIDERS } from "@/lib/providers";
import resultsData from "@/app/results.json";

const hasHardRuns = resultsData.byModel.some((model) => model.bySize.some((entry) => entry.size === "20x20" && entry.runs > 0));
const visiblePuzzles = hasHardRuns ? PUZZLES : PUZZLES.filter((puzzle) => puzzle.width !== 20);

function PuzzlesContent() {
  const [currentIndex, setCurrentIndex] = useQueryState("puzzle", parseAsInteger.withDefault(0));
  const [selectedModel, setSelectedModel] = useQueryState("model", parseAsString);
  const { filters, models, change } = usePuzzleFilters();
  const { data, error } = usePuzzleExport();
  const safeIndex = Math.max(0, Math.min(currentIndex, visiblePuzzles.length - 1));
  const puzzle = visiblePuzzles[safeIndex];
  const result = data?.puzzles.find((entry) => entry.index === safeIndex);
  const visible = useMemo(() => new Set(models.map((model) => model.model)), [models]);
  const runs = result?.runs.filter((run) => visible.has(run.model)) ?? [];
  // Runs with a grid first; runs with nothing to overlay (gave up, timed out,
  // cut off, wrong size) follow as a quieter group.
  const answered = runs.filter((run) => run.answer);
  const missing = runs.filter((run) => !run.answer);
  const renderRun = (run: PuzzleRun, noGrid: boolean) => { const model = models.find((entry) => entry.model === run.model); const active = selectedModel === run.model; return <li key={run.model}><button type="button" onClick={() => void setSelectedModel(active ? null : run.model)} aria-pressed={active} className={`flex w-full items-center gap-2 rounded-md border p-2 text-left text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ember ${active ? "border-ember bg-ember/10" : "border-transparent hover:bg-foreground/5"}`}><span style={{ color: PROVIDERS[model?.provider ?? ""]?.color }}><ProviderLogo provider={model?.provider ?? ""} size={16} /></span><span className="min-w-0 flex-1"><span className="block truncate font-medium">{model?.displayName ?? run.model}</span><span className="block truncate text-xs text-muted-foreground">{effortLabel(model?.effort ?? "none")} · ${run.cost.toFixed(4)} · {formatDuration(run.durationMs)}</span></span>{noGrid ? <span className="shrink-0 font-mono text-xs text-muted-foreground">{shortMissingAnswer(run)}</span> : <><span className={`font-mono font-bold ${run.correct ? "text-[#46FEA5]" : "text-[#FFCA16]"}`} aria-hidden="true">{run.correct ? "✓" : "✗"}</span><span className="sr-only">{run.correct ? "Solved" : "Wrong"}</span></>}</button></li>; };
  const selected = result?.runs.find((run) => run.model === selectedModel);
  const selectedMetadata = selectedModel ? puzzleModel(selectedModel) : undefined;
  const inspection = selected?.answer ? inspectAnswer(puzzle, selected.answer, result?.multipleSolutions ?? false) : null;
  const violatedRows = inspection?.mode === "ambiguous-wrong" ? inspection.clues.rowViolations.map((line) => line.index) : undefined;
  const violatedColumns = inspection?.mode === "ambiguous-wrong" ? inspection.clues.columnViolations.map((line) => line.index) : undefined;
  const goTo = useCallback((index: number) => { void setCurrentIndex(index); void setSelectedModel(null); }, [setCurrentIndex, setSelectedModel]);
  const previous = useCallback(() => goTo(safeIndex === 0 ? visiblePuzzles.length - 1 : safeIndex - 1), [goTo, safeIndex]);
  const next = useCallback(() => goTo(safeIndex === visiblePuzzles.length - 1 ? 0 : safeIndex + 1), [goTo, safeIndex]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && (event.target.closest("button, a, input, select, textarea, [role=button]") || event.target.isContentEditable)) return;
      if (event.key === "ArrowLeft") previous();
      if (event.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [previous, next]);

  return <div className="relative min-h-screen overflow-x-clip bg-background text-foreground"><div className="noise-overlay" /><div className="fixed inset-0 grid-pattern pointer-events-none" /><div className="fixed inset-0 atmosphere pointer-events-none" />
    <header className="relative border-b border-border bg-card/50"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6"><div className="flex items-center gap-3"><NonobenchMark size="sm" /><div><h1 className="font-display text-lg font-semibold lowercase tracking-tight">nonobench <Link href="/how-it-works#whats-new" className="align-middle rounded-full border border-ember/50 px-2 py-0.5 font-mono text-[10px] text-ember focus-visible:outline-2 focus-visible:outline-ember-bright">v1.2</Link></h1><p className="text-sm text-muted-foreground">Puzzle explorer · {visiblePuzzles.length} puzzles</p></div></div><nav className="flex gap-4 text-sm"><Link href="/how-it-works" className="text-muted-foreground underline focus-visible:outline-2 focus-visible:outline-ember">How it works</Link><Link href="/puzzles/overview" className="text-ember underline focus-visible:outline-2 focus-visible:outline-ember">Puzzle insights</Link><Link href="/" className="text-muted-foreground underline focus-visible:outline-2 focus-visible:outline-ember">Results</Link></nav></div></header>
    <main className="relative mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,24rem)]">
      <section aria-label={`Puzzle ${safeIndex + 1}`} className="flex min-w-0 flex-col items-center gap-5"><div className="flex w-full items-center justify-center gap-3"><button type="button" onClick={previous} aria-label="Previous puzzle" className="rounded-full border border-border p-2 focus-visible:outline-2 focus-visible:outline-ember"><CaretLeft size={20} /></button><div className="min-w-0 text-center"><span className="font-mono font-semibold">Puzzle {safeIndex + 1} of {visiblePuzzles.length}</span><span className="mx-2 text-muted-foreground">·</span><span className="font-mono text-[#FFCA16]">{puzzle.width === 20 ? sizeLabel("20x20") : `${puzzle.width}×${puzzle.height}`}</span></div><button type="button" onClick={next} aria-label="Next puzzle" className="rounded-full border border-border p-2 focus-visible:outline-2 focus-visible:outline-ember"><CaretRight size={20} /></button></div>
        <div className="max-w-full overflow-x-auto rounded-2xl border border-border bg-card/70 p-3 sm:p-6"><div className={puzzle.width === 20 ? "[zoom:0.54] sm:[zoom:1]" : ""}><Nonogram key={safeIndex} height={puzzle.height} width={puzzle.width} solution={puzzle.solution.replace(/\s/g, "")} overlay={inspection?.cells} violatedRows={violatedRows} violatedColumns={violatedColumns} /></div></div>
        {selectedModel && <div className="w-full max-w-xl rounded-lg border border-border bg-card/80 p-4 text-sm"><h2 className="font-semibold">{selectedMetadata?.displayName ?? selectedModel}’s answer</h2>{inspection ? <>
          {inspection.mode === "valid" && <p className="mt-1 text-muted-foreground">{inspection.referenceDifference ? `A valid alternative solution: differs from the reference grid in ${inspection.referenceDifference} cells but satisfies every clue.` : "This grid satisfies every row and column clue."}</p>}
          {inspection.mode === "unique-wrong" && <p className="mt-1 text-muted-foreground">{inspection.wrong} cells wrong: {inspection.wrongFilled} extra filled, {inspection.missed} missed.</p>}
          {inspection.mode === "ambiguous-wrong" && <p className="mt-1 text-muted-foreground">{inspection.clues.rowViolations.length} {inspection.clues.rowViolations.length === 1 ? "row" : "rows"} and {inspection.clues.columnViolations.length} {inspection.clues.columnViolations.length === 1 ? "column" : "columns"} don’t match their clues. Filled cells show the model’s grid without comparing it to one reference solution.</p>}
          {inspection.mode !== "valid" && <p className="mt-1 text-xs text-muted-foreground">Violated rows: {inspection.clues.rowViolations.map((line) => line.index).join(", ") || "none"}. Violated columns: {inspection.clues.columnViolations.map((line) => line.index).join(", ") || "none"}.</p>}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs"><span className="flex items-center gap-1"><span className={`size-4 ${inspection.mode === "ambiguous-wrong" ? "bg-foreground/75" : "bg-[#46FEA5]"}`} /> {inspection.mode === "ambiguous-wrong" ? "Model filled" : "Correct filled"}</span>
            {inspection.mode === "unique-wrong" && <><span className="flex items-center gap-1"><span className="flex size-4 items-center justify-center bg-[#FFCA16] font-bold text-black">×</span> Extra filled</span><span className="flex items-center gap-1"><span className="flex size-4 items-center justify-center border-2 border-[#C69CFF] font-bold text-[#C69CFF]">·</span> Missed</span></>}
            {inspection.mode === "ambiguous-wrong" && <span className="flex items-center gap-1"><span className="size-4 border-2 border-dashed border-[#D871A1]" /> Row/column clue not satisfied</span>}</div>
        </> : <p className="mt-1 text-muted-foreground">{describeMissingAnswer(selected, puzzle.width * puzzle.height)}</p>}</div>}
        <p className="text-xs text-muted-foreground">Use ← and → to change puzzles when focus is outside a control.</p>
      </section>
      <aside aria-label="Model answers" className="min-w-0" onKeyDown={(event) => {
        if (!(event.target instanceof HTMLButtonElement) || !event.target.closest("ul")) return;
        const delta = event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
        if (!delta) return;
        const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("ul button")];
        const next = buttons[buttons.indexOf(event.target) + delta];
        if (next) { event.preventDefault(); next.focus(); }
      }}><div className="rounded-xl border border-border bg-card/70 p-4"><h2 className="font-display text-xl font-semibold">Model answers</h2><p className="mt-1 text-sm text-muted-foreground">Select a model to compare its grid with the puzzle. Use ↑ and ↓ to move between models.</p><div className="mt-4"><PuzzleFilters filters={filters} change={change} count={models.length} /></div>
        {error ? <p role="alert" className="mt-4 text-sm">Could not load model answers. Refresh to try again.</p> : !data ? <p role="status" className="mt-4 text-sm">Loading answers…</p> : runs.length ? <div className="mt-4 max-h-[38rem] overflow-y-auto">{answered.length > 0 && <ul className="space-y-1" aria-label="Models that returned a grid">{answered.map((run) => renderRun(run, false))}</ul>}{missing.length > 0 && <section aria-labelledby="no-grid-heading" className={answered.length ? "mt-5 border-t border-border/60 pt-4" : ""}><h3 id="no-grid-heading" className="px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">No grid to compare · {missing.length}</h3><p className="mt-1 px-2 text-xs text-dim">These models gave up, ran out of time or tokens, or returned a grid of the wrong size.</p><ul className="mt-2 space-y-1 opacity-60 transition-opacity hover:opacity-100 focus-within:opacity-100" aria-label="Models without a usable grid">{missing.map((run) => renderRun(run, true))}</ul></section>}</div> : <p className="mt-4 text-sm text-muted-foreground">No model results match these filters{result?.attempts === 0 ? "; this puzzle has not been run yet" : ""}.</p>}
      </div></aside>
    </main>
    <footer className="relative border-t border-border bg-card/50 px-4 py-4"><div className="mx-auto flex max-w-7xl flex-wrap justify-center gap-1.5">{visiblePuzzles.map((entry, index) => <button type="button" key={index} onClick={() => goTo(index)} aria-label={`Go to puzzle ${index + 1}`} aria-current={index === safeIndex ? "step" : undefined} className={`size-3 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember ${index === safeIndex ? "ring-2 ring-white/30" : "opacity-60"} ${entry.width === 5 ? "bg-[#70B8FF]" : entry.width === 10 ? "bg-[#46FEA5]" : entry.width === 15 ? "bg-[#FFCA16]" : "bg-[#C69CFF]"}`} />)}</div></footer>
  </div>;
}

export default function PuzzlesPage() { return <Suspense fallback={<main className="min-h-screen bg-background p-6 text-foreground">Loading puzzle explorer…</main>}><PuzzlesContent /></Suspense>; }
