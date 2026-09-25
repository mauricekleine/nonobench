import { expect } from "bun:test";
import type { Puzzle } from "../visualizer/components/puzzles";
const { PUZZLES } = await import("../visualizer/components/puzzles");
import { getPuzzleId } from "./db";
import { solveByLines } from "./line-solver";

function clue(line: string): number[] {
  return (line.match(/1+/g) ?? []).map((run) => run.length);
}

function patterns(length: number, runs: number[]): number[] {
  const output: number[] = [];
  function place(index: number, start: number, mask: number): void {
    if (index === runs.length) {
      output.push(mask);
      return;
    }
    const run = runs[index]!;
    const remaining = runs.slice(index + 1).reduce((a, b) => a + b, 0) + (runs.length - index - 1);
    for (let at = start; at + run + remaining <= length; at++) {
      const bits = ((1 << run) - 1) << at;
      place(index + 1, at + run + 1, mask | bits);
    }
  }
  place(0, 0, 0);
  return output;
}

function checkPuzzle(puzzle: Puzzle): void {
  const lines = puzzle.clues.canonical.split("\n");
  const rowClues = lines.filter((line) => /^Row \d+:/.test(line.trim())).map((line) => line.split(":")[1]!.trim().split(/\s+/).map(Number));
  const columnClues = lines.filter((line) => /^Column \d+:/.test(line.trim())).map((line) => line.split(":")[1]!.trim().split(/\s+/).map(Number));
  expect(rowClues).toHaveLength(puzzle.height);
  expect(columnClues).toHaveLength(puzzle.width);
  const solution = puzzle.solution.replace(/\s+/g, "");
  expect(solution).toHaveLength(puzzle.width * puzzle.height);
  expect(solution).toMatch(/^[01]+$/);
  for (let row = 0; row < puzzle.height; row++) {
    expect(clue(solution.slice(row * puzzle.width, (row + 1) * puzzle.width))).toEqual(rowClues[row]!);
  }
  for (let col = 0; col < puzzle.width; col++) {
    expect(clue(Array.from({ length: puzzle.height }, (_, row) => solution[row * puzzle.width + col]).join(""))).toEqual(columnClues[col]!);
  }
  if (puzzle.width === 20 && puzzle.height === 20) {
    const result = solveByLines(puzzle.width, puzzle.height, rowClues, columnClues);
    expect(result.solved).toBe(true);
    expect(result.grid).toBe(solution);
    console.log(`20x20 puzzle ${index + 1} (${getPuzzleId(puzzle)}): line-solvable in ${result.sweeps} sweeps`);
    return;
  }
  const rowOptions = rowClues.map((runs) => patterns(puzzle.width, runs));
  const columnOptions = columnClues.map((runs) => patterns(puzzle.height, runs));
  let count = 0;
  function search(row: number, options: number[][]): void {
    if (count >= 2) return;
    if (row === puzzle.height) {
      count++;
      return;
    }
    for (const mask of rowOptions[row]!) {
      const next = options.map((choices, col) => choices.filter((choice) => ((choice >> row) & 1) === ((mask >> col) & 1)));
      if (next.every((choices) => choices.length > 0)) search(row + 1, next);
      if (count >= 2) return;
    }
  }
  search(0, columnOptions);
  console.log(`${puzzle.width}x${puzzle.height} puzzle ${index + 1} (${getPuzzleId(puzzle)}): ${count === 1 ? "unique" : `${count} solutions (capped at 2)`}`);
  const ambiguous = new Set([9, 11, 12, 15, 19, 22, 23, 25, 27, 30]);
  expect(count).toBe(ambiguous.has(index + 1) ? 2 : 1);
}

expect(PUZZLES).toHaveLength(40);
const index = Number(process.argv[2]);
const puzzle = PUZZLES[index];
if (!puzzle) throw new Error(`Unknown puzzle index: ${index}`);
checkPuzzle(puzzle);
