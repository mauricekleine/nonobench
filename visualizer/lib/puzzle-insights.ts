import { checkClues } from "./nonogram";
import type { Puzzle } from "@/components/puzzles/types";

export type PuzzleRun = { model: string; status: "success" | "timeout"; correct: boolean; answer: string | null; answerIssue?: "no-solution-claimed" | "empty" | "no-grid" | "wrong-size"; answerCells?: number; tokens: number; cost: number; durationMs: number };
export type PuzzleResult = { id: string; index: number; size: string; width: number; height: number; multipleSolutions: boolean; lineSolvable: boolean; attempts: number; solved: number; solveRate: number; runs: PuzzleRun[] };
export type PuzzleExport = { timestamp: string; puzzles: PuzzleResult[] };
export type CellState = "correct-filled" | "wrong-filled" | "missed" | "neutral-filled" | "empty";
export type OverlayMode = "valid" | "unique-wrong" | "ambiguous-wrong";

export function classifyAnswer(solution: string, answer: string) {
  const cells: CellState[] = [...solution].map((bit, index) =>
    answer[index] === "1" ? (bit === "1" ? "correct-filled" : "wrong-filled") : bit === "1" ? "missed" : "empty"
  );
  return { cells, wrong: cells.filter((cell) => cell === "wrong-filled" || cell === "missed").length,
    wrongFilled: cells.filter((cell) => cell === "wrong-filled").length,
    missed: cells.filter((cell) => cell === "missed").length };
}

export function inspectAnswer(puzzle: Puzzle, answer: string, multipleSolutions: boolean) {
  const solution = puzzle.solution.replace(/\s/g, "");
  if (!/^[01]+$/.test(answer) || answer.length !== solution.length) return null;
  const clues = checkClues(puzzle, answer);
  const referenceDifference = [...solution].filter((bit, index) => bit !== answer[index]).length;
  if (clues.correct) return {
    mode: "valid" as const,
    cells: [...answer].map((bit): CellState => bit === "1" ? "correct-filled" : "empty"),
    referenceDifference, wrong: 0, wrongFilled: 0, missed: 0, clues,
  };
  if (multipleSolutions) return {
    mode: "ambiguous-wrong" as const,
    cells: [...answer].map((bit): CellState => bit === "1" ? "neutral-filled" : "empty"),
    referenceDifference, wrong: 0, wrongFilled: 0, missed: 0, clues,
  };
  return { mode: "unique-wrong" as const, ...classifyAnswer(solution, answer), referenceDifference, clues };
}

export type HeatmapState = "solved" | "wrong" | "cut-off" | "not-run";
export function runState(run?: PuzzleRun): HeatmapState {
  return !run ? "not-run" : run.status === "timeout" ? "cut-off" : run.correct ? "solved" : "wrong";
}

export function shapeHeatmap(puzzles: PuzzleResult[], models: string[]) {
  return models.map((model) => ({ model, cells: puzzles.map((puzzle) => ({
    puzzle: puzzle.index, state: runState(puzzle.runs.find((run) => run.model === model)),
  })) }));
}

// One- or two-word version of describeMissingAnswer, for list rows.
export function shortMissingAnswer(run: PuzzleRun): string {
	if (run.status === "timeout") return "timed out";
	switch (run.answerIssue) {
		case "wrong-size": return "wrong size";
		case "no-solution-claimed": return "gave up";
		case "empty": return "empty";
		default: return "no grid";
	}
}

// Plain-language reason a run has no answer to overlay on the grid.
export function describeMissingAnswer(run: PuzzleRun | undefined, cells: number): string {
	if (!run) return "This model has not run this puzzle.";
	if (run.status === "timeout") return "Cut off by the provider's time limit before it answered.";
	switch (run.answerIssue) {
		case "wrong-size": {
			const got = run.answerCells ?? 0;
			const diff = got - cells;
			return `Answered with ${got} cells instead of ${cells} (${Math.abs(diff)} ${Math.abs(diff) === 1 ? "cell" : "cells"} ${diff > 0 ? "too many" : "short"}), so it can't be laid on the grid.`;
		}
		case "no-solution-claimed":
			return "Claimed the puzzle has no solution.";
		case "empty":
			return "Returned an empty answer.";
		default:
			return "The answer didn't contain a grid.";
	}
}
