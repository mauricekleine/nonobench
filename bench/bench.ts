import { generateObject, generateText, Output } from "ai";
import { codeBlock } from "common-tags";
import { z } from "zod";
import { PUZZLES, type Puzzle } from "../visualizer/components/puzzles";
import { MODELS, RERUN_THRESHOLD_DAYS, type Model } from "./constants";
import {
	dbPath,
	getPuzzleId,
	getRecentPuzzlesByModel,
	saveRunToDb,
	type BenchmarkResult,
} from "./db";

globalThis.AI_SDK_LOG_WARNINGS = false;

const recentPuzzlesByModel = getRecentPuzzlesByModel();

// Log summary of what will be skipped
if (recentPuzzlesByModel.size > 0) {
	console.log(
		`\nRecent benchmark runs found (within ${RERUN_THRESHOLD_DAYS} days):`,
	);
	for (const [model, puzzleIds] of recentPuzzlesByModel) {
		console.log(`  ${model}: ${puzzleIds.size} puzzle(s)`);
	}
}

type ModelSizeStats = {
	totalPuzzles: number;
	correctCount: number;
	failedCount: number;
	totalDuration: number;
	totalTokens: number;
	totalCost: number;
};

// Custom table formatter that doesn't show the index column
function printTable<T extends Record<string, unknown>>(data: T[]): void {
	if (data.length === 0) return;

	const firstRow = data[0];
	if (!firstRow) return;

	const columns = Object.keys(firstRow);
	const colWidths: Record<string, number> = {};

	// Calculate column widths
	for (const col of columns) {
		colWidths[col] = col.length;
		for (const row of data) {
			const val = String(row[col] ?? "");
			const width = colWidths[col] ?? 0;
			colWidths[col] = Math.max(width, val.length);
		}
	}

	// Build separator
	const sep = columns
		.map((col) => "─".repeat((colWidths[col] ?? 0) + 2))
		.join("┼");

	// Print header
	const header = columns
		.map((col) => ` ${col.padEnd(colWidths[col] ?? 0)} `)
		.join("│");
	console.log(`┌${"─".repeat(sep.length)}┐`);
	console.log(`│${header}│`);
	console.log(`├${sep}┤`);

	// Print rows
	for (const row of data) {
		const line = columns
			.map((col) => ` ${String(row[col] ?? "").padEnd(colWidths[col] ?? 0)} `)
			.join("│");
		console.log(`│${line}│`);
	}

	console.log(`└${"─".repeat(sep.length)}┘`);
}

async function runBenchmark(
	puzzle: Puzzle,
	model: Model,
): Promise<BenchmarkResult> {
	const start = performance.now();
	const size = `${puzzle.height}x${puzzle.width}`;
	const puzzleId = getPuzzleId(puzzle);

	let cost = 0;
	let tokens = 0;
	let correct = false;
	let status: "success" | "failed" = "success";
	let errorMessage: string | undefined;

	try {
		const resp = await generateObject({
			maxOutputTokens: 32000,
			model: model.llm,
			prompt: puzzle.clues.canonical,
			schema: z.object({
				solution: z.string(),
			}),
			system: codeBlock`
        You are solving a nonogram (also known as picross or griddlers).

        ## Rules
        - Each row/column has clues: numbers indicating consecutive groups of filled cells
        - Groups are separated by at least one empty cell
        - The clues appear in order from left-to-right (for rows) or top-to-bottom (for columns)

        ## Example
        A row clue "2 1" on a 5-cell row means: 2 filled cells, then a gap, then 1 filled cell.
        Possible solutions: "11010" or "11001" (but only one will satisfy all column constraints)

        ## Your Task
        Solve the puzzle so ALL row AND column clues are satisfied simultaneously.

        ## Output Format
        - Output the grid as a single string of ${puzzle.width * puzzle.height} characters
        - Use "1" for filled cells, "0" for empty cells
        - Read left-to-right, top-to-bottom (row 1 first, then row 2, etc.)

        Respond with only a JSON object:
        { "solution": "<your ${puzzle.width * puzzle.height}-character string>" }

				Important: Do not include any other text in your response. Only respond with the JSON object.
      `,
		});

		const llmSolution = resp.object.solution.replace(/\s+/g, "");
		correct = llmSolution === puzzle.solution.replace(/\s+/g, "");

		if (resp.providerMetadata) {
			const openrouterMeta = resp.providerMetadata.openrouter as any;
			if (openrouterMeta?.usage) {
				if (openrouterMeta.usage.costDetails?.upstreamInferenceCost) {
					cost = openrouterMeta.usage.costDetails.upstreamInferenceCost;
				} else if (openrouterMeta.usage.cost) {
					cost = openrouterMeta.usage.cost;
				}
			}
		}

		tokens = resp.usage?.outputTokens ?? 0;
		if (resp.providerMetadata?.google) {
			const googleMeta = resp.providerMetadata.google as any;
			if (
				googleMeta?.usageMetadata?.candidatesTokenCount &&
				googleMeta?.usageMetadata?.thoughtsTokenCount
			) {
				tokens =
					googleMeta.usageMetadata.candidatesTokenCount +
					googleMeta.usageMetadata.thoughtsTokenCount;
			}
		}

		status = "success";
	} catch (err: any) {
		console.error(`[${model.name}] Error:`, err?.message ?? String(err));

		status = "failed";
		errorMessage = err?.message ?? String(err);
		correct = false;
		cost = 0;
		tokens = 0;
	}

	const end = performance.now();
	const durationMs = end - start;

	return {
		model: model.name,
		puzzleId,
		size,
		correct,
		cost,
		tokens,
		durationMs,
		status,
		...(errorMessage ? { errorMessage } : {}),
	};
}

// Group puzzles by size
function groupPuzzlesBySize(puzzles: Puzzle[]): Map<string, Puzzle[]> {
	const groups = new Map<string, Puzzle[]>();
	for (const puzzle of puzzles) {
		const size = `${puzzle.height}x${puzzle.width}`;
		if (!groups.has(size)) {
			groups.set(size, []);
		}
		groups.get(size)!.push(puzzle);
	}
	return groups;
}

// Sort sizes in order (5x5, 10x10, 15x15)
function sortSizes(sizes: string[]): string[] {
	return [...sizes].sort((a, b) => {
		const aNum = Number.parseInt(a.split("x")[0] ?? "0", 10);
		const bNum = Number.parseInt(b.split("x")[0] ?? "0", 10);
		return aNum - bNum;
	});
}

// Run benchmark for a single model (all puzzles sequentially)
async function runModelBenchmark(model: Model): Promise<BenchmarkResult[]> {
	const puzzlesBySize = groupPuzzlesBySize(PUZZLES);
	const recentPuzzles = recentPuzzlesByModel.get(model.name) ?? new Set();
	const allResults: BenchmarkResult[] = [];

	for (const [size, puzzles] of puzzlesBySize) {
		// Filter out recently benchmarked puzzles
		const puzzlesToRun = puzzles.filter(
			(puzzle) => !recentPuzzles.has(getPuzzleId(puzzle)),
		);

		if (puzzlesToRun.length === 0) {
			console.log(`[${model.name}] Skipping ${size} (all ${puzzles.length} puzzles recently benchmarked)`);
			continue;
		}

		const skippedCount = puzzles.length - puzzlesToRun.length;
		if (skippedCount > 0) {
			console.log(`[${model.name}] Starting ${size} (${puzzlesToRun.length} puzzles, ${skippedCount} skipped)`);
		} else {
			console.log(`[${model.name}] Starting ${size} (${puzzlesToRun.length} puzzles)`);
		}

		// Run puzzles sequentially for this size
		for (let i = 0; i < puzzlesToRun.length; i++) {
			const puzzle = puzzlesToRun[i]!;
			const result = await runBenchmark(puzzle, model);
			allResults.push(result);

			// Save to database immediately after each puzzle
			saveRunToDb(result);

			// Log progress
			const status = result.correct ? "✓" : result.status === "failed" ? "✗" : "○";
			console.log(
				`[${model.name}] ${size} puzzle ${i + 1}/${puzzlesToRun.length}: ${status}`,
			);
		}

		// Log completion of this size
		const sizeResults = allResults.filter((r) => r.size === size);
		const correctCount = sizeResults.filter((r) => r.correct).length;
		const failedCount = sizeResults.filter((r) => r.status === "failed").length;
		console.log(
			`[${model.name}] Completed ${size}: ${correctCount}/${sizeResults.length} correct, ${failedCount} failed`,
		);
	}

	return allResults;
}

// Check if any model has work to do
function hasWorkToDo(): boolean {
	for (const model of MODELS) {
		const recentPuzzles = recentPuzzlesByModel.get(model.name) ?? new Set();
		for (const puzzle of PUZZLES) {
			if (!recentPuzzles.has(getPuzzleId(puzzle))) {
				return true;
			}
		}
	}
	return false;
}

if (!hasWorkToDo()) {
	console.log(
		"\nAll models and sizes have been benchmarked recently. Nothing to do.",
	);
	process.exit(0);
}

// Main execution - run all models in parallel, each processing puzzles sequentially
console.log("\n" + "=".repeat(60));
console.log("STARTING BENCHMARK");
console.log("=".repeat(60));
console.log(`Models: ${MODELS.map((m) => m.name).join(", ")}`);
console.log(`Sizes: ${sortSizes([...groupPuzzlesBySize(PUZZLES).keys()]).join(", ")}`);
console.log(`Database: ${dbPath}`);
console.log("=".repeat(60) + "\n");

const allResults = await Promise.all(MODELS.map((model) => runModelBenchmark(model)));
const flatResults = allResults.flat();

// Aggregate results by model and size for display
const statsMap = new Map<string, Map<string, ModelSizeStats>>();

for (const result of flatResults) {
	if (!statsMap.has(result.model)) {
		statsMap.set(result.model, new Map());
	}
	const modelMap = statsMap.get(result.model)!;

	if (!modelMap.has(result.size)) {
		modelMap.set(result.size, {
			totalPuzzles: 0,
			correctCount: 0,
			failedCount: 0,
			totalDuration: 0,
			totalTokens: 0,
			totalCost: 0,
		});
	}
	const stats = modelMap.get(result.size)!;

	stats.totalPuzzles++;
	if (result.correct) stats.correctCount++;
	if (result.status === "failed") stats.failedCount++;
	stats.totalDuration += result.durationMs;
	stats.totalTokens += result.tokens;
	stats.totalCost += result.cost;
}

// Get all unique sizes in order
const allSizes = sortSizes([...new Set(flatResults.map((r) => r.size))]);

// Display results
console.log("\n" + "=".repeat(60));
console.log("BENCHMARK RESULTS");
console.log("=".repeat(60));

for (const model of MODELS) {
	const modelStats = statsMap.get(model.name);
	if (!modelStats || modelStats.size === 0) continue;

	console.log(`\n=== Model: ${model.name} ===`);

	const tableData: Array<{
		Size: string;
		Puzzles: number;
		Correct: number;
		Failed: number;
		Accuracy: string;
		"Avg Time": string;
		"Avg Tokens": string;
		"Total Tokens": string;
		"Avg Cost": string;
		"Total Cost": string;
	}> = [];

	let modelTotalPuzzles = 0;
	let modelTotalCorrect = 0;
	let modelTotalFailed = 0;
	let modelTotalDuration = 0;
	let modelTotalTokens = 0;
	let modelTotalCost = 0;

	for (const size of allSizes) {
		const stats = modelStats.get(size);
		if (!stats) continue;

		const accuracy = (stats.correctCount / stats.totalPuzzles) * 100;
		const avgDuration = stats.totalDuration / stats.totalPuzzles;
		const avgTokens = stats.totalTokens / stats.totalPuzzles;
		const avgCost = stats.totalCost / stats.totalPuzzles;

		tableData.push({
			Size: size,
			Puzzles: stats.totalPuzzles,
			Correct: stats.correctCount,
			Failed: stats.failedCount,
			Accuracy: `${accuracy.toFixed(2)}%`,
			"Avg Time": `${avgDuration.toLocaleString(undefined, { maximumFractionDigits: 0 })}ms`,
			"Avg Tokens": avgTokens.toLocaleString(undefined, {
				maximumFractionDigits: 0,
			}),
			"Total Tokens": stats.totalTokens.toLocaleString(),
			"Avg Cost": `$${avgCost.toFixed(5)}`,
			"Total Cost": `$${stats.totalCost.toFixed(5)}`,
		});

		modelTotalPuzzles += stats.totalPuzzles;
		modelTotalCorrect += stats.correctCount;
		modelTotalFailed += stats.failedCount;
		modelTotalDuration += stats.totalDuration;
		modelTotalTokens += stats.totalTokens;
		modelTotalCost += stats.totalCost;
	}

	// Add totals row
	if (modelTotalPuzzles > 0) {
		const overallAccuracy = (modelTotalCorrect / modelTotalPuzzles) * 100;
		const overallAvgDuration = modelTotalDuration / modelTotalPuzzles;
		const overallAvgTokens = modelTotalTokens / modelTotalPuzzles;
		const overallAvgCost = modelTotalCost / modelTotalPuzzles;

		tableData.push({
			Size: "TOTAL",
			Puzzles: modelTotalPuzzles,
			Correct: modelTotalCorrect,
			Failed: modelTotalFailed,
			Accuracy: `${overallAccuracy.toFixed(2)}%`,
			"Avg Time": `${overallAvgDuration.toLocaleString(undefined, { maximumFractionDigits: 0 })}ms`,
			"Avg Tokens": overallAvgTokens.toLocaleString(undefined, {
				maximumFractionDigits: 0,
			}),
			"Total Tokens": modelTotalTokens.toLocaleString(),
			"Avg Cost": `$${overallAvgCost.toFixed(5)}`,
			"Total Cost": `$${modelTotalCost.toFixed(5)}`,
		});

		printTable(tableData);
	}
}

// Model ranking table (sorted by accuracy) - only for models that ran this session
type ModelRanking = {
	Rank: number;
	Model: string;
	Accuracy: string;
	"Avg Tokens": string;
	"Avg Time": string;
	"Avg Cost": string;
	"Total Cost": string;
};

const modelRankings: Array<{
	model: string;
	accuracy: number;
	avgTokens: number;
	avgTime: number;
	avgCost: number;
	totalCost: number;
}> = [];

for (const model of MODELS) {
	const modelStats = statsMap.get(model.name);
	if (!modelStats || modelStats.size === 0) continue;

	let totalPuzzles = 0;
	let totalCorrect = 0;
	let totalDuration = 0;
	let totalTokens = 0;
	let totalCost = 0;

	for (const size of allSizes) {
		const stats = modelStats.get(size);
		if (!stats) continue;
		totalPuzzles += stats.totalPuzzles;
		totalCorrect += stats.correctCount;
		totalDuration += stats.totalDuration;
		totalTokens += stats.totalTokens;
		totalCost += stats.totalCost;
	}

	if (totalPuzzles > 0) {
		modelRankings.push({
			model: model.name,
			accuracy: (totalCorrect / totalPuzzles) * 100,
			avgTokens: totalTokens / totalPuzzles,
			avgTime: totalDuration / totalPuzzles,
			avgCost: totalCost / totalPuzzles,
			totalCost,
		});
	}
}

if (modelRankings.length > 0) {
	// Sort by accuracy descending
	modelRankings.sort((a, b) => b.accuracy - a.accuracy);

	const rankingTableData: ModelRanking[] = modelRankings.map((m, idx) => ({
		Rank: idx + 1,
		Model: m.model,
		Accuracy: `${m.accuracy.toFixed(2)}%`,
		"Avg Tokens": m.avgTokens.toLocaleString(undefined, {
			maximumFractionDigits: 0,
		}),
		"Avg Time": `${m.avgTime.toLocaleString(undefined, { maximumFractionDigits: 0 })}ms`,
		"Avg Cost": `$${m.avgCost.toFixed(5)}`,
		"Total Cost": `$${m.totalCost.toFixed(5)}`,
	}));

	console.log("\n" + "=".repeat(60));
	console.log("MODEL RANKING (by accuracy) - This Session");
	console.log("=".repeat(60));
	printTable(rankingTableData);
}

// Global summary stats for this session
if (flatResults.length > 0) {
	const globalTotalRuns = flatResults.length;
	const globalTotalCorrect = flatResults.filter((r) => r.correct).length;
	const globalTotalFailed = flatResults.filter(
		(r) => r.status === "failed",
	).length;
	const globalTotalDuration = flatResults.reduce(
		(sum, r) => sum + r.durationMs,
		0,
	);
	const globalTotalTokens = flatResults.reduce((sum, r) => sum + r.tokens, 0);
	const globalTotalCost = flatResults.reduce((sum, r) => sum + r.cost, 0);

	console.log("\n" + "=".repeat(60));
	console.log("SESSION SUMMARY");
	console.log("=".repeat(60));
	console.log(`Total Runs:       ${globalTotalRuns.toLocaleString()}`);
	console.log(
		`Total Correct:    ${globalTotalCorrect.toLocaleString()} (${((globalTotalCorrect / globalTotalRuns) * 100).toFixed(2)}%)`,
	);
	console.log(
		`Total Failed:     ${globalTotalFailed.toLocaleString()} (${((globalTotalFailed / globalTotalRuns) * 100).toFixed(2)}%)`,
	);
	console.log(
		`Total Run Time:   ${(globalTotalDuration / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 })}s (${globalTotalDuration.toLocaleString(undefined, { maximumFractionDigits: 0 })}ms)`,
	);
	console.log(`Total Tokens:     ${globalTotalTokens.toLocaleString()}`);
	console.log(`Total Cost:       $${globalTotalCost.toFixed(5)}`);
	console.log("=".repeat(60));
}

console.log(`\nResults saved to database: ${dbPath}`);
console.log(`Run 'bun run export' to generate results.json`);
