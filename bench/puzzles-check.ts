import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import type { Puzzle } from "../visualizer/components/puzzles";
import { PUZZLES } from "../visualizer/components/puzzles";
import { getPuzzleId } from "./db";
import { solveByLines } from "./line-solver";

// One-based puzzle numbers pinned by the exhaustive ambiguity check below.
export const MULTIPLE_SOLUTION_PUZZLE_NUMBERS = [9, 11, 12, 15, 19, 22, 23, 25, 27, 30] as const;
const ambiguousPuzzleNumbers = new Set<number>(MULTIPLE_SOLUTION_PUZZLE_NUMBERS);
const LINE_SOLVABLE_20X20_IDS = new Set([
  "ee8afee7d47c7ac6", "10ae67320255ae66", "565cb9b2c23c139f",
  "a73bebc90376f757", "2854305400138ef4",
]);
const DEEP_20X20_IDS = new Set([
  "44b158587297cf4b", "1b0723af88accdb9", "6f72b46ca59e728e",
  "358414c49e908494", "dd480d72eb93ef3f",
]);
const uniquenessSolver = process.env.NONOGRAM_SOLVER ?? "/Users/maurice/Projects/nonogram-solver/build/nonogram_hybrid";

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
    const id = getPuzzleId(puzzle);
    assert.ok(LINE_SOLVABLE_20X20_IDS.has(id) || DEEP_20X20_IDS.has(id), `Unpinned 20x20 puzzle: ${id}`);
    const expectedLineSolvable = LINE_SOLVABLE_20X20_IDS.has(id);
    const result = solveByLines(puzzle.width, puzzle.height, rowClues, columnClues);
    assert.equal(result.solved, expectedLineSolvable);
    if (expectedLineSolvable) assert.equal(result.grid, solution);
    else assert.ok(result.grid.split("?").length - 1 >= 40);
    if (existsSync(uniquenessSolver)) {
      const check = spawnSync(uniquenessSolver, ["--check-unique", "-"], {
        input: JSON.stringify({ rows: rowClues, columns: columnClues }), encoding: "utf8", timeout: 30000,
      });
      assert.equal(check.status, 0, check.error?.message ?? check.stderr);
      const verified = JSON.parse(check.stdout) as { solved: boolean; unique: boolean; lineSolvable: boolean; solution: string; timeMs: number };
      assert.equal(verified.solved, true);
      assert.equal(verified.unique, true);
      assert.equal(verified.lineSolvable, expectedLineSolvable);
      assert.equal(verified.solution, solution);
      console.log(`20x20 puzzle ${index + 1} (${id}): unique, lineSolvable=${result.solved}, unknown=${result.grid.split("?").length - 1}, cppTimeMs=${verified.timeMs}`);
    } else {
      console.log(`20x20 puzzle ${index + 1} (${id}): C++ uniqueness check skipped (solver missing), lineSolvable=${result.solved}`);
    }
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
  assert.equal(LINE_SOLVABLE_20X20_IDS.size, 5);
  assert.equal(DEEP_20X20_IDS.size, 5);
  assert.deepEqual(
    new Set(PUZZLES.slice(30).map(getPuzzleId)),
    new Set([...LINE_SOLVABLE_20X20_IDS, ...DEEP_20X20_IDS]),
  );
  const index = Number(process.argv[2]);
  const puzzle = PUZZLES[index];
  if (!puzzle) throw new Error(`Unknown puzzle index: ${index}`);
  checkPuzzle(puzzle, index);
}
