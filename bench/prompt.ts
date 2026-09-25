import { codeBlock } from "common-tags";
import type { Puzzle } from "../visualizer/components/puzzles";
import type { AnswerFormat } from "./sizes";

export function systemPromptFor(puzzle: Puzzle, answerFormat: AnswerFormat): string {
  return answerFormat === "flat" ? flatPrompt(puzzle) : rowsPrompt(puzzle);
}

// The original prompt, verbatim: Standard stays comparable across versions.
function flatPrompt(puzzle: Puzzle): string {
  return codeBlock`
		You are solving a nonogram (also known as picross or griddlers).

		## Rules
		- Each row and column has clues: numbers indicating consecutive groups of filled cells
		- Groups are separated by at least one empty cell
		- The clues appear in order from left-to-right (for rows) or top-to-bottom (for columns)

		## Example
		A row clue "2 1" on a 5-cell row means: 2 filled cells, then a gap, then 1 filled cell.
		Possible solutions: "11010" or "11001" (but only one will satisfy all column constraints)

		## Your Task
		Solve the puzzle so ALL row AND column clues are satisfied simultaneously.

		## Output Format
		Output ONLY the solution as a single string of ${
      puzzle.width * puzzle.height
    } characters.
		- Use "1" for filled cells, "0" for empty cells
		- Read left-to-right, top-to-bottom (row 1 first, then row 2, etc.)

		IMPORTANT:
		- Do NOT include any explanation, reasoning, or intermediate steps
		- Do NOT include any other text, formatting, or symbols
		- Before outputting, ensure the solution satisfies every row and every column clue
		- If no solution satisfies all constraints, do NOT guess; output "0" instead

		You MUST ONLY output the ${
      puzzle.width * puzzle.height
    }-character solution string and nothing else.
	`;
}

// Hard mode: one row per line, so a miscount can't spread across the grid.
function rowsPrompt(puzzle: Puzzle): string {
  return codeBlock`
		You are solving a nonogram (also known as picross or griddlers).

		## Rules
		- Each row and column has clues: numbers indicating consecutive groups of filled cells
		- Groups are separated by at least one empty cell
		- The clues appear in order from left-to-right (for rows) or top-to-bottom (for columns)

		## Example
		A row clue "2 1" on a 5-cell row means: 2 filled cells, then a gap, then 1 filled cell.
		Possible solutions: "11010" or "11001" (but only one will satisfy all column constraints)

		## Your Task
		Solve the puzzle so ALL row AND column clues are satisfied simultaneously.

		## Output Format
		Output ONLY the solution as ${puzzle.height} lines, one line per row, each exactly ${puzzle.width} characters.
		- Use "1" for filled cells, "0" for empty cells
		- Line 1 is row 1 (the top row), line 2 is row 2, and so on

		IMPORTANT:
		- Do NOT include any explanation, reasoning, or intermediate steps
		- Do NOT include any other text, formatting, or symbols
		- Before outputting, ensure the solution satisfies every row and every column clue
		- If no solution satisfies all constraints, do NOT guess; output "0" instead

		You MUST ONLY output the ${puzzle.height} lines of ${puzzle.width} characters and nothing else.
	`;
}
