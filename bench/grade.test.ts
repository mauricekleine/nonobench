import { describe, expect, test } from "bun:test";
import { PUZZLES } from "../visualizer/components/puzzles";
import { gradeOutput, satisfiesClues } from "./grade";

describe("satisfiesClues", () => {
  test("accepts every stored solution", () => {
    for (const puzzle of PUZZLES) {
      expect(satisfiesClues(puzzle, puzzle.solution.replace(/\s+/g, ""))).toBe(true);
    }
  });

  test("accepts a valid alternative solution of an ambiguous puzzle", () => {
    const puzzle = PUZZLES[8]!;
    expect(puzzle.solution).toBe("0101000001100001110000010");
    expect(satisfiesClues(puzzle, "0100100010100001110000010")).toBe(true);
  });

  test("rejects grids that break a clue or have the wrong length", () => {
    const puzzle = PUZZLES[0]!;
    const solution = puzzle.solution.replace(/\s+/g, "");
    const flipped = (solution[0] === "1" ? "0" : "1") + solution.slice(1);
    expect(satisfiesClues(puzzle, flipped)).toBe(false);
    expect(satisfiesClues(puzzle, solution.slice(1))).toBe(false);
    expect(satisfiesClues(puzzle, "")).toBe(false);
  });
});

describe("gradeOutput", () => {
  test("parses and grades raw model output", () => {
    const puzzle = PUZZLES[8]!;
    expect(gradeOutput(puzzle, "01001\n00010\n10000\n11100\n00010")).toBe(true);
    expect(gradeOutput(puzzle, "0")).toBe(false);
    expect(gradeOutput(puzzle, null)).toBe(false);
  });

  test("decodes structured-output JSON, including escaped newlines between rows", () => {
    const puzzle = PUZZLES[8]!;
    expect(gradeOutput(puzzle, JSON.stringify({ solution: "01001\n00010\n10000\n11100\n00010" }))).toBe(true);
    expect(gradeOutput(puzzle, '{ "solution": "0101000001100001110000010" }')).toBe(true);
    expect(gradeOutput(puzzle, JSON.stringify({ solution: "0" }))).toBe(false);
  });
});
