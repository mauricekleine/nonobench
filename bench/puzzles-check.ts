import { strict as assert } from "node:assert";
import type { Puzzle } from "../visualizer/components/puzzles";
import { PUZZLES } from "../visualizer/components/puzzles";
import { getPuzzleId } from "./db";
import { solveByLines } from "./line-solver";

// One-based puzzle numbers pinned by the exhaustive ambiguity check below.
export const MULTIPLE_SOLUTION_PUZZLE_NUMBERS = [9, 11, 12, 15, 19, 22, 23, 25, 27, 30] as const;
const ambiguousPuzzleNumbers = new Set<number>(MULTIPLE_SOLUTION_PUZZLE_NUMBERS);

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

function checkPuzzle(puzzle: Puzzle, index: number): void {
  const lines = puzzle.clues.canonical.split("\n");
  const rowClues = lines.filter((line) => /^Row \d+:/.test(line.trim())).map((line) => line.split(":")[1]!.trim().split(/\s+/).map(Number));
  const columnClues = lines.filter((line) => /^Column \d+:/.test(line.trim())).map((line) => line.split(":")[1]!.trim().split(/\s+/).map(Number));
  assert.equal(rowClues.length, puzzle.height);
  assert.equal(columnClues.length, puzzle.width);
  const solution = puzzle.solution.replace(/\s+/g, "");
  assert.equal(solution.length, puzzle.width * puzzle.height);
  assert.match(solution, /^[01]+$/);
  for (let row = 0; row < puzzle.height; row++) {
    assert.deepEqual(clue(solution.slice(row * puzzle.width, (row + 1) * puzzle.width)), rowClues[row]!);
  }
  for (let col = 0; col < puzzle.width; col++) {
    assert.deepEqual(clue(Array.from({ length: puzzle.height }, (_, row) => solution[row * puzzle.width + col]).join("")), columnClues[col]!);
  }
  if (puzzle.width === 20 && puzzle.height === 20) {
    const result = solveByLines(puzzle.width, puzzle.height, rowClues, columnClues);
    assert.equal(result.solved, true);
    assert.equal(result.grid, solution);
    console.log(`20x20 puzzle ${index + 1} (${getPuzzleId(puzzle)}): line-solvable in ${result.sweeps} sweeps`);
    return;
  }
  const rowOptions = rowClues.map((runs) => patterns(puzzle.width, runs));
  const columnOptions = columnClues.map((runs) => patterns(puzzle.height, runs));
  let count = 0;
  function domain(options: number[], at: number): number {
    let values = 0;
    for (const mask of options) values |= ((mask >> at) & 1) === 1 ? 2 : 1;
    return values;
  }
  function constrain(options: number[], at: number, values: number): number[] {
    return options.filter((mask) => values & (((mask >> at) & 1) === 1 ? 2 : 1));
  }
  function propagate(rows: number[][], columns: number[][]): boolean {
    let changed: boolean;
    do {
      changed = false;
      const rowDomains = rows.map((options) => Array.from({ length: puzzle.width }, (_, col) => domain(options, col)));
      const columnDomains = columns.map((options) => Array.from({ length: puzzle.height }, (_, row) => domain(options, row)));
      for (let row = 0; row < puzzle.height; row++) {
        for (let col = 0; col < puzzle.width; col++) {
          const rowValues = rowDomains[row]![col]!;
          const columnValues = columnDomains[col]![row]!;
          const sharedValues = rowValues & columnValues;
          if (sharedValues === 0) return false;
          if (sharedValues !== rowValues) {
            rows[row] = constrain(rows[row]!, col, sharedValues);
            if (rows[row]!.length === 0) return false;
            changed = true;
          }
          if (sharedValues !== columnValues) {
            columns[col] = constrain(columns[col]!, row, sharedValues);
            if (columns[col]!.length === 0) return false;
            changed = true;
          }
        }
      }
    } while (changed);
    return true;
  }
  function search(rows: number[][], columns: number[][]): void {
    if (count >= 2) return;
    if (!propagate(rows, columns)) return;

    let selectedAxis: "row" | "column" | null = null;
    let selectedLine = -1;
    let selectedOptions: number[] = [];
    for (let row = 0; row < rows.length; row++) {
      if (rows[row]!.length > 1 && (selectedAxis === null || rows[row]!.length < selectedOptions.length)) {
        selectedAxis = "row";
        selectedLine = row;
        selectedOptions = rows[row]!;
      }
    }
    for (let col = 0; col < columns.length; col++) {
      if (columns[col]!.length > 1 && (selectedAxis === null || columns[col]!.length < selectedOptions.length)) {
        selectedAxis = "column";
        selectedLine = col;
        selectedOptions = columns[col]!;
      }
    }
    if (selectedAxis === null) {
      count++;
      return;
    }

    for (const mask of selectedOptions) {
      const nextRows = rows.slice();
      const nextColumns = columns.slice();
      if (selectedAxis === "row") nextRows[selectedLine] = [mask];
      else nextColumns[selectedLine] = [mask];
      search(nextRows, nextColumns);
      if (count >= 2) return;
    }
  }
  search(rowOptions, columnOptions);
  console.log(`${puzzle.width}x${puzzle.height} puzzle ${index + 1} (${getPuzzleId(puzzle)}): ${count === 1 ? "unique" : `${count} solutions (capped at 2)`}`);
  assert.equal(count, ambiguousPuzzleNumbers.has(index + 1) ? 2 : 1);
}

if (import.meta.main) {
  assert.equal(PUZZLES.length, 40);
  const index = Number(process.argv[2]);
  const puzzle = PUZZLES[index];
  if (!puzzle) throw new Error(`Unknown puzzle index: ${index}`);
  checkPuzzle(puzzle, index);
}
