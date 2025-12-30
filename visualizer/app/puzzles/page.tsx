"use client";

import {
  CaretLeft,
  CaretRight,
  GridFour,
  House,
} from "@phosphor-icons/react";
import Link from "next/link";
import { parseAsInteger, useQueryState } from "nuqs";
import { Suspense, useCallback, useEffect } from "react";

import { Nonogram } from "@/components/nonogram/nonogram";
import { PUZZLES } from "@/components/puzzles";
import { Button } from "@/components/ui/button";

function PuzzlesContent() {
  const [currentIndex, setCurrentIndex] = useQueryState(
    "puzzle",
    parseAsInteger.withDefault(0)
  );

  // Clamp index to valid range (in case of invalid URL values)
  const safeIndex = Math.max(0, Math.min(currentIndex, PUZZLES.length - 1));
  const puzzle = PUZZLES[safeIndex];

  // Clean solution string (remove whitespace from codeBlock solutions)
  const cleanSolution = puzzle.solution.replace(/\s/g, "");

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? PUZZLES.length - 1 : prev - 1));
  }, [setCurrentIndex]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === PUZZLES.length - 1 ? 0 : prev + 1));
  }, [setCurrentIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        goToPrevious();
      } else if (e.key === "ArrowRight") {
        goToNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNext, goToPrevious]);

  // Get size label
  const getSizeLabel = () => `${puzzle.width}×${puzzle.height}`;

  // Get size category for coloring
  const getSizeColor = () => {
    if (puzzle.width === 5) return "text-emerald-400";
    if (puzzle.width === 10) return "text-amber-400";
    return "text-rose-400";
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Grid pattern background */}
      <div className="fixed inset-0 grid-pattern pointer-events-none" />
      <div className="fixed inset-0 bg-linear-to-br from-primary/5 via-transparent to-chart-2/5 pointer-events-none" />

      {/* Header */}
      <header className="relative border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <GridFour className="size-5 text-primary" weight="duotone" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">
                  Puzzle Explorer
                </h1>
                <p className="text-xs text-muted-foreground">
                  Browse all {PUZZLES.length} puzzles in the benchmark
                </p>
              </div>
            </div>

            <Link href="/">
              <Button variant="ghost" size="sm">
                <House className="size-4" weight="bold" />
                <span className="hidden sm:inline">Back to Results</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative flex-1 flex items-center justify-center px-6 py-8">
        {/* Navigation arrow - Left */}
        <button
          onClick={goToPrevious}
          className="absolute left-4 sm:left-8 lg:left-16 p-3 sm:p-4 rounded-full bg-card/80 backdrop-blur-sm border border-border hover:bg-accent hover:border-primary/50 transition-all group cursor-pointer"
          aria-label="Previous puzzle"
        >
          <CaretLeft
            className="size-6 sm:size-8 text-muted-foreground group-hover:text-primary transition-colors"
            weight="bold"
          />
        </button>

        {/* Nonogram container */}
        <div className="flex flex-col items-center gap-6">
          {/* Puzzle info */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Puzzle</span>
              <span className="font-mono text-lg font-bold text-foreground">
                {safeIndex + 1}
              </span>
              <span className="text-sm text-muted-foreground">
                of {PUZZLES.length}
              </span>
            </div>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Size</span>
              <span className={`font-mono text-lg font-bold ${getSizeColor()}`}>
                {getSizeLabel()}
              </span>
            </div>
          </div>

          {/* Nonogram */}
          <div className="p-6 sm:p-8 rounded-2xl bg-card/60 backdrop-blur-sm border border-border shadow-2xl shadow-black/20">
            <Nonogram
              key={safeIndex}
              height={puzzle.height}
              width={puzzle.width}
              solution={cleanSolution}
            />
          </div>

          {/* Keyboard hint */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
            <span className="hidden sm:flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">
                ←
              </kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">
                →
              </kbd>
              <span className="ml-1">to navigate</span>
            </span>
          </div>
        </div>

        {/* Navigation arrow - Right */}
        <button
          onClick={goToNext}
          className="absolute right-4 sm:right-8 lg:right-16 p-3 sm:p-4 rounded-full bg-card/80 backdrop-blur-sm border border-border hover:bg-accent hover:border-primary/50 transition-all group cursor-pointer"
          aria-label="Next puzzle"
        >
          <CaretRight
            className="size-6 sm:size-8 text-muted-foreground group-hover:text-primary transition-colors"
            weight="bold"
          />
        </button>
      </main>

      {/* Bottom navigation dots */}
      <footer className="relative border-t border-border bg-card/50 backdrop-blur-sm py-4">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            {PUZZLES.map((p, idx) => {
              const isActive = idx === safeIndex;
              const dotColor =
                p.width === 5
                  ? "bg-emerald-500"
                  : p.width === 10
                    ? "bg-amber-500"
                    : "bg-rose-500";

              return (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer ${isActive
                    ? `${dotColor} scale-125 ring-2 ring-offset-2 ring-offset-background ring-white/20`
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                    }`}
                  aria-label={`Go to puzzle ${idx + 1}`}
                />
              );
            })}
          </div>
          <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              5×5
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              10×10
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              15×15
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function PuzzlesLoading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="fixed inset-0 grid-pattern pointer-events-none" />
      <div className="fixed inset-0 bg-linear-to-br from-primary/5 via-transparent to-chart-2/5 pointer-events-none" />
      <div className="relative flex flex-col items-center gap-4">
        <div className="p-3 bg-primary/20 rounded-xl animate-pulse">
          <GridFour className="size-8 text-primary" weight="duotone" />
        </div>
        <p className="text-sm text-muted-foreground">Loading puzzles...</p>
      </div>
    </div>
  );
}

export default function PuzzlesPage() {
  return (
    <Suspense fallback={<PuzzlesLoading />}>
      <PuzzlesContent />
    </Suspense>
  );
}
