import { ClientOnly, createFileRoute } from "@tanstack/react-router";

import { PuzzleOverview } from "@/components/puzzles/puzzle-overview";
import { stringSearch } from "@/lib/search";

export const Route = createFileRoute("/puzzles_/overview")({
	validateSearch: stringSearch<"p" | "f" | "v" | "e" | "r" | "w" | "z">(),
	head: () => ({
		meta: [
			{ title: "Puzzle insights | Nonobench" },
			{ name: "description", content: "Nonobench puzzles ranked by difficulty, with a heatmap of which models solved each one." },
		],
	}),
	component: () => (
		<ClientOnly fallback={<main className="min-h-screen bg-background p-6 text-foreground">Loading puzzle overview…</main>}>
			<PuzzleOverview />
		</ClientOnly>
	),
});
