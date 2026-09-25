import { describe, expect, test } from "bun:test";
import { PUZZLES } from "@/components/puzzles";
import { classifyAnswer, describeMissingAnswer, inspectAnswer, shapeHeatmap, type PuzzleResult, type PuzzleRun } from "./puzzle-insights";
import puzzleData from "@/public/puzzle-results.json";

test("classifies extra and missed cells with separate counts", () => {
  expect(classifyAnswer("1100", "1010")).toEqual({ cells: ["correct-filled", "missed", "wrong-filled", "empty"], wrong: 2, wrongFilled: 1, missed: 1 });
});

test("valid reference grid satisfies clues", () => {
  const puzzle = PUZZLES[0];
  const answer = puzzle.solution.replace(/\s/g, "");
  const inspection = inspectAnswer(puzzle, answer, false);
  expect(inspection?.mode).toBe("valid");
  expect(inspection?.wrong).toBe(0);
  expect(inspection?.clues.correct).toBe(true);
  expect(inspectAnswer(puzzle, "1", false)).toBeNull();
});

test("a correct alternative has no error cells despite differing from the reference", () => {
  const puzzle = PUZZLES[8];
  const reference = puzzle.solution.replace(/\s/g, "");
  const alternative = puzzleData.puzzles[8].runs.find((run) => run.correct && run.answer && run.answer !== reference)?.answer;
  expect(alternative).toBeDefined();
  const inspection = inspectAnswer(puzzle, alternative!, true);
  expect(inspection!.mode).toBe("valid");
  expect(inspection!.referenceDifference).toBeGreaterThan(0);
  expect(inspection!.wrong).toBe(0);
  expect(inspection!.cells).not.toContain("wrong-filled");
  expect(inspection!.cells).not.toContain("missed");
  expect(inspection!.clues.correct).toBe(true);
});

test("a wrong ambiguous answer shows neutral cells and clue violations", () => {
  const run = puzzleData.puzzles[8].runs.find((entry) => !entry.correct && entry.answer);
  const inspection = inspectAnswer(PUZZLES[8], run!.answer!, true);
  expect(inspection!.mode).toBe("ambiguous-wrong");
  expect(inspection!.cells).toContain("neutral-filled");
  expect(inspection!.cells).not.toContain("wrong-filled");
  expect(inspection!.cells).not.toContain("missed");
  expect(inspection!.clues.rowViolations.length + inspection!.clues.columnViolations.length).toBeGreaterThan(0);
});

test("a wrong unique answer keeps reference diff and clue violations", () => {
  const run = puzzleData.puzzles[0].runs.find((entry) => !entry.correct && entry.answer);
  const inspection = inspectAnswer(PUZZLES[0], run!.answer!, false);
  expect(inspection!.mode).toBe("unique-wrong");
  expect(inspection!.wrong).toBeGreaterThan(0);
  expect(inspection!.cells.some((cell) => cell === "wrong-filled" || cell === "missed")).toBe(true);
  expect(inspection!.clues.rowViolations.length + inspection!.clues.columnViolations.length).toBeGreaterThan(0);
});

test("heatmap maps missing runs and timeout separately", () => {
  const puzzle = { index: 0, runs: [{ model: "a", status: "timeout", correct: false, answer: null, tokens: 0, cost: 0, durationMs: 1 }] } as PuzzleResult;
  expect(shapeHeatmap([puzzle], ["a", "b"])).toEqual([{ model: "a", cells: [{ puzzle: 0, state: "cut-off" }] }, { model: "b", cells: [{ puzzle: 0, state: "not-run" }] }]);
});

describe("describeMissingAnswer", () => {
	const run = (patch: Partial<PuzzleRun>): PuzzleRun => ({ model: "m", status: "success", correct: false, answer: null, tokens: 0, cost: 0, durationMs: 0, ...patch });
	test("explains each reason in plain language", () => {
		expect(describeMissingAnswer(undefined, 25)).toBe("This model has not run this puzzle.");
		expect(describeMissingAnswer(run({ status: "timeout" }), 25)).toMatch(/time limit/);
		expect(describeMissingAnswer(run({ answerIssue: "wrong-size", answerCells: 224 }), 225)).toBe("Answered with 224 cells instead of 225 (1 cell short), so it can't be laid on the grid.");
		expect(describeMissingAnswer(run({ answerIssue: "wrong-size", answerCells: 240 }), 225)).toMatch(/15 cells too many/);
		expect(describeMissingAnswer(run({ answerIssue: "no-solution-claimed" }), 25)).toBe("Claimed the puzzle has no solution.");
		expect(describeMissingAnswer(run({ answerIssue: "empty" }), 25)).toBe("Returned an empty answer.");
		expect(describeMissingAnswer(run({ answerIssue: "no-grid" }), 25)).toBe("The answer didn't contain a grid.");
	});
});
