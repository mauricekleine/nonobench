import { fileURLToPath } from "node:url";
import { PUZZLES } from "../visualizer/components/puzzles";
import { parseClues } from "../visualizer/lib/nonogram";
import { getPuzzleId, openReadDb } from "./db";
import { extractOutputSolution, gradeOutput, structuredRows } from "./grade";
import { solveByLines } from "./line-solver";
import { MULTIPLE_SOLUTION_PUZZLE_NUMBERS } from "./puzzles-check";

type PuzzleRunRow = {
	model: string;
	puzzle_id: string;
	status: "success" | "timeout";
	raw_output: string | null;
	tokens: number;
	cost: number;
	duration_ms: number;
	output_mode: string | null;
	provider_name: string | null;
	quantization: string | null;
	generation_id: string | null;
};

type PuzzleResultRun = {
	model: string;
	status: "success" | "timeout";
	correct: boolean;
	answer: string | null;
	// Why there is no overlayable answer (absent when `answer` is set).
	answerIssue?: AnswerIssue;
	// Cells in the extracted grid when it has the wrong size.
	answerCells?: number;
	tokens: number;
	cost: number;
	durationMs: number;
	harness: "v1.0" | "v1.2";
	providerName: string | null;
	quantization: string | null;
	generationId: string | null;
};

type PuzzleResult = {
	id: string;
	index: number;
	size: string;
	width: number;
	height: number;
	multipleSolutions: boolean;
	lineSolvable: boolean;
	attempts: number;
	solved: number;
	solveRate: number;
	runs: PuzzleResultRun[];
};

type AnswerIssue = "no-solution-claimed" | "empty" | "no-grid" | "wrong-size";

// Classify a run without an overlayable grid, so the explorer can say what
// the model actually did instead of a generic "no usable grid".
function answerIssue(rawOutput: string | null, extracted: string | null, cells: number): { answerIssue: AnswerIssue; answerCells?: number } {
	if (extracted && extracted.length !== cells) return { answerIssue: "wrong-size", answerCells: extracted.length };
	// Malformed row arrays are never repaired into a grid; report their size.
	const rows = structuredRows(rawOutput);
	if (rows?.length) return { answerIssue: "wrong-size", answerCells: rows.join("").replace(/[^01]/g, "").length };
	let text = rawOutput ?? "";
	try {
		const parsed: unknown = JSON.parse(text);
		if (parsed && typeof parsed === "object" && "solution" in parsed && typeof parsed.solution === "string") text = parsed.solution;
	} catch {
		// Free-text answer.
	}
	if (!text.trim()) return { answerIssue: "empty" };
	if (/^\s*0\s*$/.test(text)) return { answerIssue: "no-solution-claimed" };
	return { answerIssue: "no-grid" };
}

type PuzzleResults = {
	timestamp: string;
	puzzles: PuzzleResult[];
};

/** Write the model-by-puzzle view consumed by the puzzle explorer. */
export async function writePuzzleResultsExport(): Promise<void> {
	const db = openReadDb();
	if (!db) throw new Error("Database does not exist");

	try {
		const columns = new Set(db.query<{ name: string }, []>("PRAGMA table_info(runs)").all().map((column) => column.name));
		const optionalColumn = (name: string) => columns.has(name) ? name : `NULL AS ${name}`;
		const rows = db
			.query<PuzzleRunRow, []>(
				`SELECT model, puzzle_id, status, raw_output, tokens, cost, duration_ms, ${optionalColumn("output_mode")}, ${optionalColumn("provider_name")}, ${optionalColumn("quantization")}, ${optionalColumn("generation_id")} FROM runs WHERE status IN ('success', 'timeout') ORDER BY model, puzzle_id`,
			)
			.all();
		const rowsByPuzzleId = new Map<string, PuzzleRunRow[]>();
		for (const row of rows) {
			const puzzleRows = rowsByPuzzleId.get(row.puzzle_id) ?? [];
			puzzleRows.push(row);
			rowsByPuzzleId.set(row.puzzle_id, puzzleRows);
		}

		const multipleSolutionNumbers = new Set<number>(MULTIPLE_SOLUTION_PUZZLE_NUMBERS);
		const puzzles = PUZZLES.map((puzzle, index): PuzzleResult => {
			const id = getPuzzleId(puzzle);
			const clues = parseClues(puzzle);
			const lineSolvable = solveByLines(puzzle.width, puzzle.height, clues.rows, clues.columns).solved;
			const runs = (rowsByPuzzleId.get(id) ?? []).map((row): PuzzleResultRun => {
				const correct = row.status === "success" && gradeOutput(puzzle, row.raw_output);
				const extracted = row.status === "success" ? extractOutputSolution(puzzle, row.raw_output) : null;
				const answer = extracted?.length === puzzle.width * puzzle.height && /^[01]+$/.test(extracted)
					? extracted
					: null;
				const cells = puzzle.width * puzzle.height;
				return {
					model: row.model,
					status: row.status,
					correct,
					answer,
					...(row.status === "success" && !answer ? answerIssue(row.raw_output, extracted, cells) : {}),
					tokens: row.tokens,
					cost: row.cost,
					durationMs: row.duration_ms,
					harness: row.output_mode === null ? "v1.0" : "v1.2",
					providerName: row.provider_name,
					quantization: row.quantization,
					generationId: row.generation_id,
				};
			});
			const solved = runs.reduce((count, run) => count + Number(run.correct), 0);

			return {
				id,
				index,
				size: `${puzzle.width}x${puzzle.height}`,
				width: puzzle.width,
				height: puzzle.height,
				multipleSolutions: multipleSolutionNumbers.has(index + 1),
				lineSolvable,
				attempts: runs.length,
				solved,
				solveRate: runs.length === 0 ? 0 : solved / runs.length,
				runs,
			};
		});

		const output: PuzzleResults = { timestamp: new Date().toISOString(), puzzles };
		const outputPath = process.env.NONOBENCH_PUZZLE_RESULTS_JSON
			?? fileURLToPath(new URL("../visualizer/public/puzzle-results.json", import.meta.url));
		await Bun.write(outputPath, JSON.stringify(output, null, 2));
		console.log(`\nExported ${rows.length} per-puzzle runs to: ${outputPath}`);
	} finally {
		db.close();
	}
}
