import {
	type OpenRouterCompletionSettings,
	openrouter,
} from "@openrouter/ai-sdk-provider";
import { generateText, type LanguageModel, Output } from "ai";
import { codeBlock } from "common-tags";
import { z } from "zod";
import { PUZZLES, type Puzzle } from "./puzzles";

const defaultProviderOptions: OpenRouterCompletionSettings = {
	usage: {
		include: true,
	},
};

export type Model = {
	llm: LanguageModel;
	name: string;
	reasoning?: boolean;
};

const MODELS: Model[] = [
	{
		llm: openrouter("anthropic/claude-4.5-sonnet", defaultProviderOptions),
		name: "claude-4.5-sonnet",
	},
	{
		llm: openrouter("anthropic/claude-4.5-opus", defaultProviderOptions),
		name: "claude-4.5-opus",
	},
	{
		llm: openrouter("google/gemini-3-flash-preview", defaultProviderOptions),
		name: "gemini-3-flash-preview",
	},
	{
		llm: openrouter("moonshotai/kimi-k2", defaultProviderOptions),
		name: "kimi-k2",
	},
	// {
	// 	llm: openrouter("minimax/minimax-m2.1", defaultProviderOptions),
	// 	name: "minimax-m2.1",
	// },
	{
		llm: openrouter("openai/gpt-5.2", defaultProviderOptions),
		name: "gpt-5.2",
	},
	{
		llm: openrouter("z-ai/glm-4.7", defaultProviderOptions),
		name: "glm-4.7",
	},
];

type BenchmarkResult = {
	model: string;
	size: string;
	correct: boolean;
	cost: number;
	tokens: number;
	durationMs: number;
	status: "success" | "failed";
	errorMessage?: string;
};

type ModelSizeStats = {
	totalPuzzles: number;
	correctCount: number;
	failedCount: number;
	totalDuration: number;
	totalTokens: number;
	totalCost: number;
};

type BenchmarkResults = {
	timestamp: string;
	summary: {
		models: string[];
		sizes: string[];
	};
	byModel: Array<{
		model: string;
		overallAccuracy: number;
		overallCorrect: number;
		overallTotal: number;
		bySize: Array<{
			size: string;
			accuracy: number;
			correct: number;
			total: number;
			avgDurationMs: number;
			avgTokens: number;
			totalTokens: number;
			avgCost: number;
			totalCost: number;
		}>;
	}>;
	chartData: Array<{
		model: string;
		size: string;
		accuracy: number;
		correct: number;
		total: number;
		avgDurationMs: number;
		avgTokens: number;
		totalTokens: number;
		avgCost: number;
		totalCost: number;
	}>;
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

	let cost = 0;
	let tokens = 0;
	let correct = false;
	let status: "success" | "failed" = "success";
	let errorMessage: string | undefined;

	try {
		const resp = await generateText({
			model: model.llm,
			prompt: puzzle.clues.canonical,
			output: Output.object({
				schema: z.object({
					solution: z.string(),
				}),
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
      `,
		});

		const llmSolution = resp.output.solution.replace(/\s+/g, "");
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

		tokens = resp.totalUsage?.outputTokens ?? 0;
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
		console.error(err);

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
		size,
		correct,
		cost,
		tokens,
		durationMs,
		status,
		...(errorMessage ? { errorMessage } : {}),
	};
}

// Main execution
const allResults: BenchmarkResult[] = [];

// Process puzzles sequentially, but run all models in parallel for each puzzle
for (const puzzle of PUZZLES) {
	const puzzleResults = await Promise.all(
		MODELS.map((model) => runBenchmark(puzzle, model)),
	);
	allResults.push(...puzzleResults);

	// Log progress
	const size = `${puzzle.height}x${puzzle.width}`;
	const correctCount = puzzleResults.filter((r) => r.correct).length;
	console.log(
		`[${size}] Puzzle complete: ${correctCount}/${MODELS.length} models correct`,
	);
}

// Aggregate results by model and size
const statsMap = new Map<string, Map<string, ModelSizeStats>>();

for (const result of allResults) {
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
const allSizes = [...new Set(allResults.map((r) => r.size))].sort((a, b) => {
	const aNum = Number.parseInt(a.split("x")[0] ?? "0", 10);
	const bNum = Number.parseInt(b.split("x")[0] ?? "0", 10);
	return aNum - bNum;
});

// Display results
console.log("\n" + "=".repeat(60));
console.log("BENCHMARK RESULTS");
console.log("=".repeat(60));

for (const model of MODELS) {
	const modelStats = statsMap.get(model.name);
	if (!modelStats) continue;

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

// Model ranking table (sorted by accuracy)
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
	if (!modelStats) continue;

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

	modelRankings.push({
		model: model.name,
		accuracy: (totalCorrect / totalPuzzles) * 100,
		avgTokens: totalTokens / totalPuzzles,
		avgTime: totalDuration / totalPuzzles,
		avgCost: totalCost / totalPuzzles,
		totalCost,
	});
}

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
console.log("MODEL RANKING (by accuracy)");
console.log("=".repeat(60));
printTable(rankingTableData);

// Global summary stats
const globalTotalRuns = allResults.length;
const globalTotalCorrect = allResults.filter((r) => r.correct).length;
const globalTotalDuration = allResults.reduce(
	(sum, r) => sum + r.durationMs,
	0,
);
const globalTotalTokens = allResults.reduce((sum, r) => sum + r.tokens, 0);
const globalTotalCost = allResults.reduce((sum, r) => sum + r.cost, 0);

console.log("\n" + "=".repeat(60));
console.log("GLOBAL SUMMARY");
console.log("=".repeat(60));
console.log(`Total Runs:       ${globalTotalRuns.toLocaleString()}`);
console.log(
	`Total Correct:    ${globalTotalCorrect.toLocaleString()} (${((globalTotalCorrect / globalTotalRuns) * 100).toFixed(2)}%)`,
);
console.log(
	`Total Run Time:   ${(globalTotalDuration / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 })}s (${globalTotalDuration.toLocaleString(undefined, { maximumFractionDigits: 0 })}ms)`,
);
console.log(`Total Tokens:     ${globalTotalTokens.toLocaleString()}`);
console.log(`Total Cost:       $${globalTotalCost.toFixed(5)}`);
console.log("=".repeat(60));

// Build JSON export
const jsonResults: BenchmarkResults = {
	timestamp: new Date().toISOString(),
	summary: {
		models: MODELS.map((m) => m.name),
		sizes: allSizes,
	},
	byModel: [],
	chartData: [],
};

for (const model of MODELS) {
	const modelStats = statsMap.get(model.name);
	if (!modelStats) continue;

	let overallCorrect = 0;
	let overallTotal = 0;
	const bySize: BenchmarkResults["byModel"][0]["bySize"] = [];

	for (const size of allSizes) {
		const stats = modelStats.get(size);
		if (!stats) continue;

		const accuracy = (stats.correctCount / stats.totalPuzzles) * 100;
		const avgDurationMs = stats.totalDuration / stats.totalPuzzles;
		const avgTokens = stats.totalTokens / stats.totalPuzzles;
		const avgCost = stats.totalCost / stats.totalPuzzles;

		const sizeData = {
			size,
			accuracy,
			correct: stats.correctCount,
			total: stats.totalPuzzles,
			avgDurationMs,
			avgTokens,
			totalTokens: stats.totalTokens,
			avgCost,
			totalCost: stats.totalCost,
		};

		bySize.push(sizeData);
		jsonResults.chartData.push({
			model: model.name,
			...sizeData,
		});

		overallCorrect += stats.correctCount;
		overallTotal += stats.totalPuzzles;
	}

	jsonResults.byModel.push({
		model: model.name,
		overallAccuracy: (overallCorrect / overallTotal) * 100,
		overallCorrect,
		overallTotal,
		bySize,
	});
}

// Write JSON file
const jsonPath = new URL("../visualizer/app/results.json", import.meta.url)
	.pathname;
await Bun.write(jsonPath, JSON.stringify(jsonResults, null, 2));
console.log(`\nResults written to: ${jsonPath}`);
