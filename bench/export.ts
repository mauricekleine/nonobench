import { PUZZLES } from "../visualizer/components/puzzles";
import { MODELS } from "./constants";
import { getPuzzleId, openReadDb } from "./db";
import { gradeOutput } from "./grade";
import { sortSizes } from "./sizes";

const db = openReadDb();
if (!db) throw new Error("Database does not exist");

// Correctness is re-derived from each stored output (any grid satisfying all
// clues counts), so the database itself is never rewritten.
const puzzlesById = new Map(PUZZLES.map((puzzle) => [getPuzzleId(puzzle), puzzle]));
const correctRuns = new Set<string>();
for (const row of db
	.query<{ model: string; puzzle_id: string; status: string; correct: number; raw_output: string | null }, []>(
		"SELECT model, puzzle_id, status, correct, raw_output FROM runs",
	)
	.all()) {
	const puzzle = puzzlesById.get(row.puzzle_id);
	const correct = row.status === "success" && (puzzle ? gradeOutput(puzzle, row.raw_output) : row.correct === 1);
	if (correct) correctRuns.add(`${row.model}\u0000${row.puzzle_id}`);
}
const correctRunsJson = JSON.stringify([...correctRuns]);

// Runs from before strict structured output have no output_mode (older
// databases lack the column entirely). A variant is "legacy" when none of its
// runs used structured output; the site fades those so new runs stand out.
const hasOutputMode = db
	.query<{ name: string }, []>("PRAGMA table_info(runs)")
	.all()
	.some((column) => column.name === "output_mode");
const structuredModels = new Set(
	hasOutputMode
		? db
				.query<{ model: string }, []>("SELECT DISTINCT model FROM runs WHERE output_mode IS NOT NULL")
				.all()
				.map((row) => row.model)
		: [],
);

// Output paths
const resultsPath = process.env.NONOBENCH_RESULTS_JSON ?? new URL("../visualizer/app/results.json", import.meta.url).pathname;
const resultsRawPath = process.env.NONOBENCH_RESULTS_RAW_JSON ?? new URL("../visualizer/public/results-raw.json", import.meta.url).pathname;

// Types for the JSON output (matching existing format)
type SizeData = {
	size: string;
	timestamp: string;
	accuracy: number;
	correct: number;
	failed: number;
	total: number;
	runs: number;
	avgDurationMs: number;
	totalDurationMs: number;
	avgTokens: number;
	totalTokens: number;
	avgCost: number;
	totalCost: number;
};

type ModelData = {
	model: string;
	family: string;
	effort: string;
	legacy: boolean;
	reasoning: boolean;
	overallAccuracy: number;
	overallCorrect: number;
	overallFailed: number;
	overallTotal: number;
	overallRuns: number;
	bySize: SizeData[];
};

type ErrorMessageData = {
	message: string;
	count: number;
};

type ModelErrorData = {
	model: string;
	totalErrors: number;
	errors: ErrorMessageData[];
};

type BenchmarkResults = {
	timestamp: string;
	summary: {
		models: string[];
		sizes: string[];
	};
	byModel: ModelData[];
	chartData: Array<{ model: string; family: string; effort: string; legacy: boolean } & SizeData>;
	errorsByModel: ModelErrorData[];
};

// Query type for aggregated stats
type AggregatedRow = {
	model: string;
	size: string;
	timestamp: string;
	reasoning: number;
	total: number;
	runs: number;
	correct: number;
	failed: number;
	avg_duration_ms: number;
	total_duration_ms: number;
	avg_tokens: number;
	total_tokens: number;
	avg_cost: number;
	total_cost: number;
};

// Query type for raw results
type RawRow = {
	model: string;
	puzzle_id: string;
	size: string;
	timestamp: string;
	reasoning: number;
	correct: number;
	status: string;
	duration_ms: number;
	tokens: number;
	cost: number;
	error_message: string | null;
	raw_input: string | null;
	raw_output: string | null;
	output_mode: string | null;
};

// Output type for raw results JSON
type RawResult = {
	model: string;
	puzzleId: string;
	size: string;
	timestamp: string;
	reasoning: boolean;
	correct: boolean;
	status: string;
	durationMs: number;
	tokens: number;
	cost: number;
	errorMessage: string | null;
	rawInput: string | null;
	rawOutput: string | null;
	outputMode: string;
};

type RawResults = {
	timestamp: string;
	runs: RawResult[];
};

// Aggregate stats from the runs table
// All averages and totals EXCLUDE failed runs (status = 'failed')
const aggregatedResults = db
	.query<AggregatedRow, { $correctRuns: string }>(
		`
    SELECT
      model,
      size,
      MAX(timestamp) as timestamp,
      MAX(reasoning) as reasoning,
      COUNT(*) as total,
      SUM(CASE WHEN status != 'failed' THEN 1 ELSE 0 END) as runs,
      SUM(CASE WHEN model || char(0) || puzzle_id IN (SELECT value FROM json_each($correctRuns)) THEN 1 ELSE 0 END) as correct,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
      AVG(CASE WHEN status != 'failed' THEN duration_ms ELSE NULL END) as avg_duration_ms,
      SUM(CASE WHEN status != 'failed' THEN duration_ms ELSE 0 END) as total_duration_ms,
      AVG(CASE WHEN status != 'failed' THEN tokens ELSE NULL END) as avg_tokens,
      SUM(CASE WHEN status != 'failed' THEN tokens ELSE 0 END) as total_tokens,
      AVG(CASE WHEN status != 'failed' THEN cost ELSE NULL END) as avg_cost,
      SUM(CASE WHEN status != 'failed' THEN cost ELSE 0 END) as total_cost
    FROM runs
    GROUP BY model, size
    ORDER BY model, size
  `,
	)
	.all({ $correctRuns: correctRunsJson });

if (aggregatedResults.length === 0) {
	console.log("No runs found in database. Nothing to export.");
	process.exit(0);
}

// Query error messages grouped by model
type ErrorRow = {
	model: string;
	error_message: string;
	count: number;
};

const errorResults = db
	.query<ErrorRow, []>(
		`
    SELECT 
      model,
      error_message,
      COUNT(*) as count
    FROM runs
    WHERE error_message IS NOT NULL AND error_message != ''
    GROUP BY model, error_message
    ORDER BY model, count DESC
  `,
	)
	.all();

// Build errorsByModel structure
const errorMap = new Map<string, ErrorMessageData[]>();
for (const row of errorResults) {
	if (!errorMap.has(row.model)) {
		errorMap.set(row.model, []);
	}
	errorMap.get(row.model)!.push({
		message: row.error_message,
		count: row.count,
	});
}

const errorsByModel: ModelErrorData[] = [];
for (const [model, errors] of errorMap) {
	errorsByModel.push({
		model,
		totalErrors: errors.reduce((sum, e) => sum + e.count, 0),
		errors,
	});
}
// Sort by total errors descending
errorsByModel.sort((a, b) => b.totalErrors - a.totalErrors);

// Build the results structure
const modelMap = new Map<string, SizeData[]>();
const modelReasoningMap = new Map<string, boolean>();
const allSizes = new Set<string>();

for (const row of aggregatedResults) {
	if (!modelMap.has(row.model)) {
		modelMap.set(row.model, []);
	}
	// Store reasoning for each model (use first value seen, should be consistent)
	if (!modelReasoningMap.has(row.model)) {
		modelReasoningMap.set(row.model, row.reasoning === 1);
	}

	// Accuracy is calculated from runs (excluding failed), not total
	const sizeData: SizeData = {
		size: row.size,
		timestamp: row.timestamp,
		accuracy: row.runs > 0 ? (row.correct / row.runs) * 100 : 0,
		correct: row.correct,
		failed: row.failed,
		total: row.total,
		runs: row.runs,
		avgDurationMs: row.avg_duration_ms ?? 0,
		totalDurationMs: row.total_duration_ms,
		avgTokens: row.avg_tokens ?? 0,
		totalTokens: row.total_tokens,
		avgCost: row.avg_cost ?? 0,
		totalCost: row.total_cost,
	};

	modelMap.get(row.model)!.push(sizeData);
	allSizes.add(row.size);
}

// Build byModel array
const byModel: ModelData[] = [];
const chartData: BenchmarkResults["chartData"] = [];
const modelsByName = new Map(MODELS.map((model) => [model.name, model]));

for (const [model, sizeDatas] of modelMap) {
	const metadata = modelsByName.get(model);
	if (!metadata) throw new Error(`Cannot export unknown DB model: ${model}`);
	// Sort size data by size
	const sortedSizeDatas = sortSizes(sizeDatas.map((s) => s.size)).map(
		(size) => sizeDatas.find((s) => s.size === size)!,
	);

	// Calculate overall stats
	let overallCorrect = 0;
	let overallFailed = 0;
	let overallTotal = 0;
	let overallRuns = 0;

	for (const sizeData of sortedSizeDatas) {
		overallCorrect += sizeData.correct;
		overallFailed += sizeData.failed;
		overallTotal += sizeData.total;
		overallRuns += sizeData.runs;

		// Add to chartData
		chartData.push({
			model,
			family: metadata.family,
			effort: metadata.effort,
			legacy: !structuredModels.has(model),
			...sizeData,
		});
	}

	// Overall accuracy uses runs (excluding failed), not total
	byModel.push({
		model,
		family: metadata.family,
		effort: metadata.effort,
		legacy: !structuredModels.has(model),
		reasoning: modelReasoningMap.get(model) ?? false,
		overallAccuracy: overallRuns > 0 ? (overallCorrect / overallRuns) * 100 : 0,
		overallCorrect,
		overallFailed,
		overallTotal,
		overallRuns,
		bySize: sortedSizeDatas,
	});
}

// Sort byModel by overall accuracy descending
byModel.sort((a, b) => b.overallAccuracy - a.overallAccuracy);

// Build final results
const results: BenchmarkResults = {
	timestamp: new Date().toISOString(),
	summary: {
		models: byModel.map((m) => m.model),
		sizes: sortSizes([...allSizes]),
	},
	byModel,
	chartData,
	errorsByModel,
};

// Write to file
await Bun.write(resultsPath, JSON.stringify(results, null, 2));

console.log(`Exported ${aggregatedResults.length} model+size combinations to:`);
console.log(`  ${resultsPath}`);
console.log(`\nSummary:`);
console.log(`  Models: ${results.summary.models.length}`);
console.log(`  Sizes: ${results.summary.sizes.join(", ")}`);

// Show per-model stats
console.log(`\nModel Accuracy:`);
for (const modelData of byModel) {
	console.log(
		`  ${modelData.model}: ${modelData.overallAccuracy.toFixed(2)}% (${modelData.overallCorrect}/${modelData.overallTotal})`,
	);
}

// Show error stats
if (errorsByModel.length > 0) {
	const totalErrors = errorsByModel.reduce((sum, m) => sum + m.totalErrors, 0);
	console.log(`\nError Messages: ${totalErrors} total across ${errorsByModel.length} models`);
}

// Query and export raw results
const rawResults = db
	.query<RawRow, []>(
		`
    SELECT
      model,
      puzzle_id,
      size,
      timestamp,
      reasoning,
      correct,
      status,
      duration_ms,
      tokens,
      cost,
      error_message,
      raw_input,
      raw_output,
      ${hasOutputMode ? "output_mode" : "NULL AS output_mode"}
    FROM runs
    ORDER BY model, size, timestamp
  `,
	)
	.all();

// Transform to camelCase output format
const rawResultsOutput: RawResults = {
	timestamp: new Date().toISOString(),
	runs: rawResults.map((row) => ({
		model: row.model,
		puzzleId: row.puzzle_id,
		size: row.size,
		timestamp: row.timestamp,
		reasoning: row.reasoning === 1,
		correct: correctRuns.has(`${row.model}\u0000${row.puzzle_id}`),
		status: row.status,
		durationMs: row.duration_ms,
		tokens: row.tokens,
		cost: row.cost,
		errorMessage: row.error_message,
		rawInput: row.raw_input,
		rawOutput: row.raw_output,
		outputMode: row.output_mode ?? "text",
	})),
};

// Write raw results to file
await Bun.write(resultsRawPath, JSON.stringify(rawResultsOutput, null, 2));

console.log(`\nExported ${rawResults.length} raw runs to:`);
console.log(`  ${resultsRawPath}`);

db.close();
