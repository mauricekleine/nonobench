import type { Metadata } from "next";
import { Suspense } from "react";
import { PuzzleOverview } from "@/components/puzzles/puzzle-overview";

export const metadata: Metadata = { title: "Puzzle insights | Nonobench", description: "Nonobench puzzles ranked by difficulty, with a heatmap of which models solved each one." };

export default function Page() {
  return <Suspense fallback={<main className="min-h-screen bg-background p-6 text-foreground">Loading puzzle overview…</main>}><PuzzleOverview /></Suspense>;
}
