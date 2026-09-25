import type { Puzzle } from "../components/puzzles/types";

// Shared by the benchmark grader (bench/grade.ts) and the public API, so both
// agree on what counts as a correct grid.

function runLengths(line: string): string {
	return (line.match(/1+/g) ?? []).map((run) => run.length).join(" ") || "0";
}

export function parseClues(puzzle: Puzzle): { rows: number[][]; columns: number[][] } {
	const lines = puzzle.clues.canonical.split("\n").map((line) => line.trim());
	const clues = (pattern: RegExp) =>
		lines
			.filter((line) => pattern.test(line))
			.map((line) => (line.split(":")[1] ?? "").trim().split(/\s+/).map(Number));
	return { rows: clues(/^Row \d+:/), columns: clues(/^Column \d+:/) };
}

// Clues normalised to run-length strings; an empty line is "0" either way.
function clueStrings(puzzle: Puzzle): { rows: string[]; columns: string[] } {
	const { rows, columns } = parseClues(puzzle);
	const toString = (clue: number[]) => runLengths(clue.map((n) => "1".repeat(n)).join("0"));
	return { rows: rows.map(toString), columns: columns.map(toString) };
}

export type LineViolation = { index: number; expected: string; actual: string };

export type ClueCheck = {
	correct: boolean;
	error?: string;
	rowViolations: LineViolation[];
	columnViolations: LineViolation[];
};

// Ten of the 30 puzzles admit more than one solution, so a grid is judged
// against the clues rather than the stored solution string.
export function checkClues(puzzle: Puzzle, grid: string): ClueCheck {
	const size = puzzle.width * puzzle.height;
	if (!/^[01]+$/.test(grid) || grid.length !== size) {
		return {
			correct: false,
			error: `Grid must be exactly ${size} characters of 0 and 1 (got ${grid.length}).`,
			rowViolations: [],
			columnViolations: [],
		};
	}
	const { rows, columns } = clueStrings(puzzle);
	const rowViolations: LineViolation[] = [];
	const columnViolations: LineViolation[] = [];
	for (let row = 0; row < puzzle.height; row++) {
		const actual = runLengths(grid.slice(row * puzzle.width, (row + 1) * puzzle.width));
		const expected = rows[row] ?? "0";
		if (actual !== expected) rowViolations.push({ index: row + 1, expected, actual });
	}
	for (let col = 0; col < puzzle.width; col++) {
		let line = "";
		for (let row = 0; row < puzzle.height; row++) line += grid[row * puzzle.width + col];
		const actual = runLengths(line);
		const expected = columns[col] ?? "0";
		if (actual !== expected) columnViolations.push({ index: col + 1, expected, actual });
	}
	return {
		correct: rowViolations.length === 0 && columnViolations.length === 0,
		rowViolations,
		columnViolations,
	};
}

export function satisfiesClues(puzzle: Puzzle, grid: string): boolean {
	return checkClues(puzzle, grid).correct;
}
