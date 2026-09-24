import type { Puzzle } from "../visualizer/components/puzzles";
import { parseSolution } from "./parse-solution";

function runLengths(line: string): string {
  return (line.match(/1+/g) ?? []).map((run) => run.length).join(" ") || "0";
}

function parseClues(puzzle: Puzzle): { rows: string[]; columns: string[] } {
  const lines = puzzle.clues.canonical.split("\n").map((line) => line.trim());
  const clues = (pattern: RegExp) =>
    lines
      .filter((line) => pattern.test(line))
      .map((line) => runLengths(line.split(":")[1]!.trim().split(/\s+/).map((n) => "1".repeat(Number(n))).join("0")));
  return { rows: clues(/^Row \d+:/), columns: clues(/^Column \d+:/) };
}

// A grid is correct when it satisfies every row and column clue. Ten of the 30
// puzzles admit more than one solution, so comparing against the stored
// solution string would reject valid answers.
export function satisfiesClues(puzzle: Puzzle, grid: string): boolean {
  if (!/^[01]+$/.test(grid) || grid.length !== puzzle.width * puzzle.height) return false;
  const { rows, columns } = parseClues(puzzle);
  for (let row = 0; row < puzzle.height; row++) {
    if (runLengths(grid.slice(row * puzzle.width, (row + 1) * puzzle.width)) !== rows[row]) return false;
  }
  for (let col = 0; col < puzzle.width; col++) {
    let line = "";
    for (let row = 0; row < puzzle.height; row++) line += grid[row * puzzle.width + col];
    if (runLengths(line) !== columns[col]) return false;
  }
  return true;
}

// Structured-output runs store the JSON response; decode it so escapes such as
// "\n" between rows become real whitespace. Legacy free-text runs are not JSON.
function answerText(rawOutput: string): string {
  try {
    const parsed: unknown = JSON.parse(rawOutput);
    if (parsed && typeof parsed === "object" && "solution" in parsed && typeof parsed.solution === "string") {
      return parsed.solution;
    }
  } catch {
    // Not JSON: grade the raw text.
  }
  return rawOutput;
}

export function gradeOutput(puzzle: Puzzle, rawOutput: string | null): boolean {
  const grid = parseSolution(answerText(rawOutput ?? ""), puzzle.width * puzzle.height);
  return !!grid && satisfiesClues(puzzle, grid);
}
