import type { Puzzle } from "../visualizer/components/puzzles";
import { satisfiesClues } from "../visualizer/lib/nonogram";
import { parseSolution } from "./parse-solution";

export { satisfiesClues };

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
