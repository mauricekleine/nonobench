import { describe, expect, test } from "bun:test";
import { PUZZLES } from "../visualizer/components/puzzles";
import { getPuzzleId } from "./db";
import { extractOutputSolution, gradeOutput, satisfiesClues } from "./grade";

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

  test("uses the final complete answer after a draft grid (deepseek-v3.2 run)", () => {
    const puzzle = PUZZLES.find((p) => getPuzzleId(p) === "6f84bfd3f1a7cbc9")!;
    const output = "11111\n10111\n11010\n11000\n10000\n\nThe initial guess is wrong.\n\n**Answer:**\n1111110111110100110000100";
    expect(extractOutputSolution(puzzle, output)).toBe("1111110111110100110000100");
    expect(gradeOutput(puzzle, output)).toBe(true);
  });

  test("keeps a final answer separate from a labelled row (claude-4.5-opus-high run)", () => {
    const puzzle = PUZZLES.find((p) => getPuzzleId(p) === "015afc53630076a9")!;
    const output = "Row 10: 1000000110\n\n0101000001010010001001011111100111101000111111100011111100101111111110111110100111111011101000000110";
    expect(extractOutputSolution(puzzle, output)?.length).toBe(100);
    expect(gradeOutput(puzzle, output)).toBe(true);
  });

  test("keeps a final answer separate from an unlabelled grid (claude-fable-5.1-low run)", () => {
    const puzzle = PUZZLES.find((p) => getPuzzleId(p) === "60d381bdbdb0391b")!;
    const output = "00011\n10010\n10000\n00101\n11100\n\n0001110010100000010111100";
    expect(extractOutputSolution(puzzle, output)).toBe("0001110010100000010111100");
    expect(gradeOutput(puzzle, output)).toBe(true);
  });

  test("does not repair a structured answer with an extra digit", () => {
    const puzzle = PUZZLES.find((p) => getPuzzleId(p) === "a1768b5ed90b204b")!;
    const output = JSON.stringify({ solution: "01000011100110010111101110110100011101110001111101000111111100011111110111111111111111111110001111111" });
    expect(gradeOutput(puzzle, output)).toBe(false);
  });
});
