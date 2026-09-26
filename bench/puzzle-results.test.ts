import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";
import { PUZZLES } from "../visualizer/components/puzzles";
import { parseClues } from "../visualizer/lib/nonogram";
import { getPuzzleId } from "./db";
import { solveByLines } from "./line-solver";

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
	id: string;
	index: number;
	size: string;
	width: number;
	height: number;
	lineSolvable: boolean;
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
	test("20x20 IDs and line solvability match the current puzzle set", () => {
		const extended = puzzleResults.puzzles.slice(30);
		expect(extended).toHaveLength(10);
		expect(extended.filter((puzzle) => puzzle.lineSolvable)).toHaveLength(5);
		for (const exported of extended) {
			const source = PUZZLES[exported.index]!;
			const clues = parseClues(source);
			expect(exported.id).toBe(getPuzzleId(source));
			expect(exported.lineSolvable).toBe(solveByLines(source.width, source.height, clues.rows, clues.columns).solved);
		}
	});

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
