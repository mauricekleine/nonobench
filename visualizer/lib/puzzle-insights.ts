import { checkClues } from "./nonogram";
import type { Puzzle } from "@/components/puzzles/types";

export type PuzzleRun = { model: string; status: "success" | "timeout"; correct: boolean; answer: string | null; tokens: number; cost: number; durationMs: number };
export type PuzzleResult = { id: string; index: number; size: string; width: number; height: number; multipleSolutions: boolean; lineSolvable: boolean; attempts: number; solved: number; solveRate: number; runs: PuzzleRun[] };
export type PuzzleExport = { timestamp: string; puzzles: PuzzleResult[] };
export type CellState = "correct-filled" | "wrong-filled" | "missed" | "empty";

export function classifyAnswer(solution: string, answer: string) {
  const cells: CellState[] = [...solution].map((bit, index) =>
    answer[index] === "1" ? (bit === "1" ? "correct-filled" : "wrong-filled") : bit === "1" ? "missed" : "empty"
  );
  return { cells, wrong: cells.filter((cell) => cell === "wrong-filled" || cell === "missed").length,
    wrongFilled: cells.filter((cell) => cell === "wrong-filled").length,
    missed: cells.filter((cell) => cell === "missed").length };
}

export function inspectAnswer(puzzle: Puzzle, answer: string) {
  const solution = puzzle.solution.replace(/\s/g, "");
  if (!/^[01]+$/.test(answer) || answer.length !== solution.length) return null;
  return { ...classifyAnswer(solution, answer), clues: checkClues(puzzle, answer) };
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
