import { expect, test } from "bun:test";
import { PUZZLES } from "@/components/puzzles";
import { classifyAnswer, inspectAnswer, shapeHeatmap, type PuzzleResult } from "./puzzle-insights";
import puzzleData from "@/public/puzzle-results.json";

test("classifies extra and missed cells with separate counts", () => {
  expect(classifyAnswer("1100", "1010")).toEqual({ cells: ["correct-filled", "missed", "wrong-filled", "empty"], wrong: 2, wrongFilled: 1, missed: 1 });
});

test("valid reference grid satisfies clues", () => {
  const puzzle = PUZZLES[0];
  const answer = puzzle.solution.replace(/\s/g, "");
  const inspection = inspectAnswer(puzzle, answer);
  expect(inspection?.wrong).toBe(0);
  expect(inspection?.clues.correct).toBe(true);
  expect(inspectAnswer(puzzle, "1")).toBeNull();
});

test("another valid solution may differ from the reference grid", () => {
  const puzzle = PUZZLES[8];
  const reference = puzzle.solution.replace(/\s/g, "");
  const alternative = puzzleData.puzzles[8].runs.find((run) => run.correct && run.answer && run.answer !== reference)?.answer;
  expect(alternative).toBeDefined();
  const inspection = inspectAnswer(puzzle, alternative!);
  expect(inspection!.wrong).toBeGreaterThan(0);
  expect(inspection!.clues.correct).toBe(true);
});

test("heatmap maps missing runs and timeout separately", () => {
  const puzzle = { index: 0, runs: [{ model: "a", status: "timeout", correct: false, answer: null, tokens: 0, cost: 0, durationMs: 1 }] } as PuzzleResult;
  expect(shapeHeatmap([puzzle], ["a", "b"])).toEqual([{ model: "a", cells: [{ puzzle: 0, state: "cut-off" }] }, { model: "b", cells: [{ puzzle: 0, state: "not-run" }] }]);
});
