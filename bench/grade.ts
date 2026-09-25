import type { Puzzle } from "../visualizer/components/puzzles";
import { satisfiesClues } from "../visualizer/lib/nonogram";
import { parseSolution } from "./parse-solution";
import { answerFormatFor } from "./sizes";

export { satisfiesClues };

// Structured-output runs store the JSON response; decode it so escapes such as
// "\n" between rows become real whitespace. Legacy free-text runs are not JSON.
function answerText(rawOutput: string): string {
  try {
    const parsed: unknown = JSON.parse(rawOutput);
    if (parsed && typeof parsed === "object" && "solution" in parsed) {
      if (typeof parsed.solution === "string") return parsed.solution;
      // Row-format structured answers: an array of row strings.
      if (Array.isArray(parsed.solution) && parsed.solution.every((row) => typeof row === "string")) {
        return parsed.solution.join("\n");
      }
    }
  } catch {
    // Not JSON: grade the raw text.
  }
  return rawOutput;
}

export function gradeOutput(puzzle: Puzzle, rawOutput: string | null): boolean {
  const grid = extractOutputSolution(puzzle, rawOutput);
  return !!grid && satisfiesClues(puzzle, grid);
}

// Keep answer extraction shared between grading and the puzzle-results export.
// Structured-output JSON is decoded before parseSolution, just as it is for grading.
export function extractOutputSolution(puzzle: Puzzle, rawOutput: string | null): string | null {
  const text = answerText(rawOutput ?? "");
  if (answerFormatFor(`${puzzle.width}x${puzzle.height}`) === "rows") {
    const grid = lastRowBlock(text, puzzle.width, puzzle.height);
    if (grid) return grid;
  }
  return parseSolution(text, puzzle.width * puzzle.height);
}

// Row-format answers: the last run of exactly `height` consecutive lines that
// each hold `width` cells is the final grid; earlier blocks are drafts.
// Spaces between cells are tolerated. A block with the wrong number of rows
// is not a grid, so the answer falls back to the flat parser (and fails).
function lastRowBlock(text: string, width: number, height: number): string | null {
  const rowPattern = new RegExp(`^[01]{${width}}$`);
  let block: string[] = [];
  let last: string[] | null = null;
  for (const line of [...text.split(/\r?\n/), ""]) {
    const cells = line.replace(/[\s,|"'\[\]]/g, "");
    if (rowPattern.test(cells)) {
      block.push(cells);
      continue;
    }
    if (block.length === height) last = block;
    block = [];
  }
  return last ? last.join("") : null;
}
