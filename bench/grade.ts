import type { Puzzle } from "../visualizer/components/puzzles";
import { satisfiesClues } from "../visualizer/lib/nonogram";
import { parseSolution } from "./parse-solution";

export { satisfiesClues };

export function gradeOutput(puzzle: Puzzle, rawOutput: string | null): boolean {
  const grid = parseSolution(rawOutput ?? "", puzzle.width * puzzle.height);
  return !!grid && satisfiesClues(puzzle, grid);
}
