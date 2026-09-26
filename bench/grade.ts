import type { Puzzle } from "../visualizer/components/puzzles";
import { satisfiesClues } from "../visualizer/lib/nonogram";
import { parseSolution } from "./parse-solution";
import { answerFormatFor } from "./sizes";

export { satisfiesClues };

// Structured-output runs store the JSON response; decode it so escapes such as
// "\n" between rows become real whitespace. Legacy free-text runs are not JSON.
function parseStructured(rawOutput: string): unknown {
  try {
    const parsed: unknown = JSON.parse(rawOutput);
    if (parsed && typeof parsed === "object" && "solution" in parsed) return parsed.solution;
  } catch {
    // Not JSON: grade the raw text.
  }
  return undefined;
}

// Row-format structured answers: the array of row strings, if that is what
// the model returned.
export function structuredRows(rawOutput: string | null): string[] | null {
  const solution = parseStructured(rawOutput ?? "");
  return Array.isArray(solution) && solution.every((row) => typeof row === "string") ? solution : null;
}

// The prompt's "no solution" answer: "0", or an empty or ["0"] structured answer.
export function claimsNoSolution(rawOutput: string | null): boolean {
  const solution = parseStructured(rawOutput ?? "");
  if (Array.isArray(solution)) return solution.length === 0 || (solution.length === 1 && String(solution[0]).trim() === "0");
  const text = typeof solution === "string" ? solution : rawOutput ?? "";
  return /^\s*0\s*$/.test(text);
}

function answerText(rawOutput: string): string {
  const solution = parseStructured(rawOutput);
  return typeof solution === "string" ? solution : rawOutput;
}

export function gradeOutput(puzzle: Puzzle, rawOutput: string | null): boolean {
  const grid = extractOutputSolution(puzzle, rawOutput);
  return !!grid && grid.length === puzzle.width * puzzle.height && satisfiesClues(puzzle, grid);
}

// Keep answer extraction shared between grading and the puzzle-results export.
// Returns the grid the model gave, or the cells it wrote when the size is
// wrong. Returns null when there is no grid, or when a row-format answer is
// malformed but happens to have the right total: such answers are never
// repaired into a grid.
export function extractOutputSolution(puzzle: Puzzle, rawOutput: string | null): string | null {
  const { width, height } = puzzle;
  const cells = width * height;
  const rows = structuredRows(rawOutput);
  if (rows) {
    const clean = rows.map((row) => row.replace(/\s/g, ""));
    const rowPattern = new RegExp(`^[01]{${width}}$`);
    if (clean.length === height && clean.every((row) => rowPattern.test(row))) return clean.join("");
    const written = clean.join("").replace(/[^01]/g, "");
    return written.length === cells || !written ? null : written;
  }
  const text = answerText(rawOutput ?? "");
  if (answerFormatFor(`${width}x${height}`) !== "rows") return parseSolution(text, cells);
  // Row format in text: the answer that ends last wins, whether it is a block
  // of rows or a single flat string. Earlier grids are drafts.
  const block = lastRowBlock(text, width, height);
  const flat = [...text.matchAll(new RegExp(`(?<![01])[01]{${cells}}(?![01])`, "g"))].at(-1);
  const flatEnd = flat ? (flat.index ?? 0) + flat[0].length : -1;
  if (block && block.end >= flatEnd) return block.grid;
  if (flat) return flat[0];
  const fallback = parseSolution(text, cells);
  return fallback && fallback.length !== cells ? fallback : null;
}

// Row-format answers: the last run of exactly `height` consecutive lines that
// each hold `width` cells. Spaces and separators between cells are tolerated.
function lastRowBlock(text: string, width: number, height: number): { grid: string; end: number } | null {
  const rowPattern = new RegExp(`^[01]{${width}}$`);
  let block: string[] = [];
  let last: { grid: string; end: number } | null = null;
  let offset = 0;
  for (const line of [...text.split(/(?<=\n)/), ""]) {
    const cells = line.replace(/[\s,|"'\[\]]/g, "");
    if (line && rowPattern.test(cells)) {
      block.push(cells);
    } else {
      if (block.length === height) last = { grid: block.join(""), end: offset };
      block = [];
    }
    offset += line.length;
  }
  return last;
}
