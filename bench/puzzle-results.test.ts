import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";

type ExportedRun = {
	model: string;
	status: "success" | "timeout";
	correct: boolean;
	answer: string | null;
	tokens: number;
	cost: number;
	durationMs: number;
};

type ExportedPuzzle = {
	index: number;
	size: string;
	width: number;
	height: number;
	attempts: number;
	solved: number;
	runs: ExportedRun[];
};

type PuzzleResults = { puzzles: ExportedPuzzle[] };
type DashboardResults = {
	summary: { coreSizes: string[] };
	byModel: Array<{ model: string; overallCorrect: number }>;
};

const puzzleResults = JSON.parse(
	readFileSync(new URL("../visualizer/public/puzzle-results.json", import.meta.url), "utf8"),
) as PuzzleResults;
const dashboardResults = JSON.parse(
	readFileSync(new URL("../visualizer/app/results.json", import.meta.url), "utf8"),
) as DashboardResults;

describe("puzzle results export", () => {
	test("per-model core correct counts match results.json", () => {
		const coreSizes = new Set(dashboardResults.summary.coreSizes);
		for (const model of dashboardResults.byModel) {
			const correct = puzzleResults.puzzles
				.filter((puzzle) => coreSizes.has(puzzle.size))
				.flatMap((puzzle) => puzzle.runs)
				.filter((run) => run.model === model.model && run.correct).length;
			expect(correct).toBe(model.overallCorrect);
		}
	});

	test("puzzle and run totals agree with their exported rows", () => {
		for (const [index, puzzle] of puzzleResults.puzzles.entries()) {
			expect(puzzle.index).toBe(index);
			expect(puzzle.attempts).toBe(puzzle.runs.length);
			expect(puzzle.solved).toBe(puzzle.runs.filter((run) => run.correct).length);
			for (const run of puzzle.runs) {
				expect(["success", "timeout"]).toContain(run.status);
				if (run.status === "timeout") {
					expect(run.correct).toBe(false);
					expect(run.answer).toBeNull();
				} else if (run.answer !== null) {
					expect(run.answer).toMatch(/^[01]+$/);
					expect(run.answer).toHaveLength(puzzle.width * puzzle.height);
				}
			}
		}
	});
});
