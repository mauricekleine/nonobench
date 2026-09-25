import { Suspense } from "react";
import { PuzzleOverview } from "@/components/puzzles/puzzle-overview";

export default function Page() {
  return <Suspense fallback={<main className="min-h-screen bg-background p-6 text-foreground">Loading puzzle overview…</main>}><PuzzleOverview /></Suspense>;
}
