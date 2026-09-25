import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import resultsData from "@/app/results.json";
import { PUZZLES, type Puzzle } from "@/components/puzzles";
import { parseClues } from "@/lib/nonogram";

// Read-only views over the exported benchmark data, shared by the REST API,
// the MCP server and the markdown pages.

export const SITE_URL = "https://nonobench.com";

type SizeData = {
	size: string;
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
	reasoning: boolean;
	overallAccuracy: number;
	overallCorrect: number;
	overallFailed: number;
	overallTotal: number;
	overallRuns: number;
	bySize: SizeData[];
};

const results = resultsData as unknown as {
	timestamp: string;
	summary: { models: string[]; sizes: string[] };
	byModel: ModelData[];
};

export const RESULTS_TIMESTAMP = results.timestamp;
export const SIZES = results.summary.sizes;

const round = (value: number, digits: number) => Number(value.toFixed(digits));

function sizeSummary(size: SizeData) {
	return {
		size: size.size,
		accuracy: round(size.accuracy, 1),
		correct: size.correct,
		total: size.total,
		failedRuns: size.failed,
		avgDurationMs: Math.round(size.avgDurationMs),
		avgTokens: Math.round(size.avgTokens),
		avgCostUsd: round(size.avgCost, 6),
		totalCostUsd: round(size.totalCost, 6),
	};
}

export function getLeaderboard(size?: string) {
	const rows = results.byModel.map((model) => {
		const bySize = model.bySize.find((entry) => entry.size === size);
		return {
			model: model.model,
			reasoning: model.reasoning,
			accuracy: round(size ? (bySize?.accuracy ?? 0) : model.overallAccuracy, 1),
			correct: size ? (bySize?.correct ?? 0) : model.overallCorrect,
			total: size ? (bySize?.total ?? 0) : model.overallTotal,
			totalCostUsd: round(
				size ? (bySize?.totalCost ?? 0) : model.bySize.reduce((sum, entry) => sum + entry.totalCost, 0),
				6,
			),
		};
	});
	rows.sort((a, b) => b.accuracy - a.accuracy || a.totalCostUsd - b.totalCostUsd);
	return rows.map((row, index) => ({ rank: index + 1, ...row }));
}

export function getModel(name: string) {
	const model = results.byModel.find((entry) => entry.model === name);
	if (!model) return null;
	return {
		model: model.model,
		reasoning: model.reasoning,
		accuracy: round(model.overallAccuracy, 1),
		correct: model.overallCorrect,
		total: model.overallTotal,
		failedRuns: model.overallFailed,
		bySize: model.bySize.map(sizeSummary),
	};
}

export function getModelNames() {
	return results.byModel.map((model) => model.model);
}

export function getPuzzleId(puzzle: Puzzle): string {
	return createHash("md5").update(puzzle.solution).digest("hex").slice(0, 16);
}

function describePuzzle(puzzle: Puzzle, index: number) {
	const { rows, columns } = parseClues(puzzle);
	return {
		id: getPuzzleId(puzzle),
		index,
		size: `${puzzle.width}x${puzzle.height}`,
		width: puzzle.width,
		height: puzzle.height,
		rowClues: rows,
		columnClues: columns,
		url: `${SITE_URL}/puzzles?puzzle=${index}`,
	};
}

export function listPuzzles(size?: string) {
	return PUZZLES.map(describePuzzle).filter((puzzle) => !size || puzzle.size === size);
}

export function findPuzzle(id: string) {
	const index = PUZZLES.findIndex((puzzle) => getPuzzleId(puzzle) === id);
	const puzzle = PUZZLES[index];
	return puzzle ? { puzzle, index } : null;
}

export function getPuzzle(id: string, includeSolution = false) {
	const found = findPuzzle(id);
	if (!found) return null;
	return {
		...describePuzzle(found.puzzle, found.index),
		prompt: found.puzzle.clues.canonical,
		...(includeSolution ? { referenceSolution: found.puzzle.solution } : {}),
	};
}

type RawRun = {
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
	rawInput: string;
	rawOutput: string | null;
};

let rawRuns: Promise<RawRun[]> | undefined;

// The raw export is several MB, so it is only loaded when runs are requested.
function loadRawRuns() {
	rawRuns ??= readFile(path.join(process.cwd(), "public/results-raw.json"), "utf8").then(
		(json) => (JSON.parse(json) as { runs: RawRun[] }).runs,
	);
	return rawRuns;
}

export type RunQuery = {
	model?: string;
	puzzleId?: string;
	size?: string;
	includeOutput?: boolean;
	limit?: number;
	offset?: number;
};

export const MAX_RUNS_LIMIT = 500;

export async function listRuns(query: RunQuery) {
	const limit = Math.min(Math.max(query.limit ?? 100, 1), MAX_RUNS_LIMIT);
	const offset = Math.max(query.offset ?? 0, 0);
	const matching = (await loadRawRuns()).filter(
		(run) =>
			(!query.model || run.model === query.model) &&
			(!query.puzzleId || run.puzzleId === query.puzzleId) &&
			(!query.size || run.size === query.size),
	);
	return {
		total: matching.length,
		limit,
		offset,
		runs: matching.slice(offset, offset + limit).map(({ rawInput, rawOutput, ...run }) =>
			query.includeOutput ? { ...run, rawInput, rawOutput } : run,
		),
	};
}
