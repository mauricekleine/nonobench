import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

import {
	findPuzzle,
	getLeaderboard,
	getVariants,
	getModel,
	listProviders,
	listFamilies,
	compareModels,
	getPuzzle,
	listPuzzles,
	listRuns,
	MAX_RUNS_LIMIT,
	RESULTS_TIMESTAMP,
	SIZES,
} from "@/lib/data";
import { checkClues } from "@/lib/nonogram";
import { parseCommaList, validateFilters, type Filters } from "@/lib/leaderboard";
import { filteredModelIds, loadPuzzleResults } from "@/lib/puzzle-results-server";
import { runState } from "@/lib/puzzle-insights";

export const MCP_SERVER_INFO = { name: "nonobench", title: "Nonobench", version: "1.1.0" };

const readOnly = (title: string) => ({ title, readOnlyHint: true, openWorldHint: false } as const);

// structuredContent lets clients read the output schema; the text block carries the same JSON for older clients.
const result = (data: Record<string, unknown>) => ({ content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }], structuredContent: data });
const failure = (message: string) => ({ content: [{ type: "text" as const, text: message }], isError: true });

// Output schemas name the fields agents rely on and allow the rest, so adding a field never breaks a call.
const variant = z.looseObject({ model: z.string().describe("Model variant id, e.g. claude-opus-5.5-high"), displayName: z.string(), family: z.string(), effort: z.string().nullable(), provider: z.string().nullable(), reasoning: z.boolean(), accuracy: z.number().describe("Percentage of puzzles solved") });
const puzzleSummary = z.looseObject({ id: z.string(), index: z.number(), size: z.string(), width: z.number(), height: z.number(), rowClues: z.array(z.array(z.number())), columnClues: z.array(z.array(z.number())), url: z.string() });
const leaderboardOutput = z.object({ updatedAt: z.string(), size: z.string(), models: z.array(variant.extend({ rank: z.number(), correct: z.number(), total: z.number(), totalCostUsd: z.number() })) });
const providersOutput = z.object({ providers: z.array(z.looseObject({ id: z.string(), name: z.string(), variantCount: z.number(), families: z.array(z.string()) })) });
const familiesOutput = z.object({ families: z.array(z.looseObject({ family: z.string(), displayName: z.string(), provider: z.string().nullable(), bestVariant: z.string(), efforts: z.array(z.string()) })) });
const modelOutput = variant.extend({ correct: z.number(), total: z.number(), failedRuns: z.number(), bySize: z.array(z.looseObject({ size: z.string() })) });
const puzzlesOutput = z.object({ puzzles: z.array(puzzleSummary) });
const puzzleOutput = puzzleSummary.extend({ prompt: z.string().describe("Clue text as models received it"), referenceSolution: z.string().optional() });
const checkOutput = z.looseObject({ correct: z.boolean(), error: z.string().optional(), rowViolations: z.array(z.unknown()), columnViolations: z.array(z.unknown()) });
const puzzleResultsOutput = z.object({ updatedAt: z.string(), puzzleId: z.string(), index: z.number(), size: z.string(), attempts: z.number(), solved: z.number(), runs: z.array(z.looseObject({ model: z.string(), correct: z.boolean(), status: z.string(), displayName: z.string(), answer: z.string().nullable().optional() })) });
const modelPuzzlesOutput = z.object({ model: z.string(), displayName: z.string(), solved: z.number(), attempted: z.number(), puzzles: z.array(z.looseObject({ id: z.string(), index: z.number(), size: z.string(), state: z.enum(["solved", "wrong", "cut-off", "not-run"]) })) });
const runsOutput = z.object({ total: z.number(), limit: z.number(), offset: z.number(), runs: z.array(z.looseObject({ model: z.string(), puzzleId: z.string(), size: z.string(), correct: z.boolean(), status: z.string() })) });

const reasoningFilter = z.boolean().optional().describe("Only reasoning (true) or non-reasoning (false) variants");
const openWeightsFilter = z.boolean().optional().describe("Only open-weight (true) or closed (false) models");

const size = z
	.enum(SIZES as [string, ...string[]])
	.optional()
	.describe("Grid size to filter on");

export function createMcpServer() {
	const server = new McpServer(MCP_SERVER_INFO, {
		instructions: `Nonobench measures how well LLMs solve nonogram (picross) puzzles: 40 puzzles across ${SIZES.join(", ")} grids. Standard is 5x5, 10x10 and 15x15, and overall accuracy covers those 30 puzzles. Hard mode is ten 20x20 puzzles, reported only per size (size "20x20"). Accuracy is the share of puzzles where the model's grid satisfies every row and column clue. Results last updated ${RESULTS_TIMESTAMP}.`,
		capabilities: { tools: { listChanged: false } },
		cacheHints: { "tools/list": { ttlMs: 3_600_000, cacheScope: "public" } },
	});

	server.registerTool(
		"get_leaderboard",
		{
			title: "Get leaderboard",
			description: "Models ranked by accuracy; defaults to all effort levels for compatibility.",
			inputSchema: z.object({ size, provider: z.string().optional().describe("Comma-separated provider ids; empty means no filter"), family: z.string().optional().describe("Comma-separated family ids; empty means no filter"), version: z.string().optional().describe("Comma-separated benchmark versions: 1.0, 1.1, 1.2; empty means all"), effort: z.string().optional().describe("best, all (default), or one effort level; empty means all"), reasoning: reasoningFilter, open_weights: openWeightsFilter, min_correct: z.number().int().min(0).optional().describe("Minimum puzzles solved in the selected tier; default 0 includes unsolved variants") }),
			outputSchema: leaderboardOutput,
			annotations: readOnly("Get leaderboard"),
		},
		async ({ size, provider, family, version, effort, reasoning, open_weights, min_correct }) => {
			const filters: Filters = { size, providers: parseCommaList(provider), families: parseCommaList(family), versions: parseCommaList(version) as Filters["versions"], effort: effort?.trim() || "all", reasoning, openWeights: open_weights, minCorrect: min_correct ?? 0 };
			const error = validateFilters(getVariants().map((model) => ({ ...model, family: model.family ?? model.model, effort: model.effort ?? "none", provider: model.provider ?? "" })), filters, SIZES);
			return error ? failure(error) : result({ updatedAt: RESULTS_TIMESTAMP, size: size ?? "all", models: getLeaderboard(size, filters) });
		},
	);

	server.registerTool("list_providers", { title: "List providers", description: "Provider ids, names, families and variant counts.", inputSchema: z.object({}), outputSchema: providersOutput, annotations: readOnly("List providers") }, async () => result({ providers: listProviders() }));
	server.registerTool("list_families", { title: "List families", description: "Model families, available efforts and best variants.", inputSchema: z.object({}), outputSchema: familiesOutput, annotations: readOnly("List families") }, async () => result({ families: listFamilies() }));
	server.registerTool("compare_models", { title: "Compare models", description: "Side-by-side core overall and per-size accuracy, cost, latency and token results for model or family names.", inputSchema: z.object({ models: z.array(z.string()).min(2).max(20).describe("2 to 20 model variant ids or family names, e.g. claude-opus-5.5 or gpt-6-astra-xhigh") }), outputSchema: z.object({ models: z.array(modelOutput) }), annotations: readOnly("Compare models") }, async ({ models }) => {
		const compared = compareModels(models);
		const missing = models.filter((_, index) => !compared[index]);
		return missing.length ? failure(`Unknown model or family: ${missing.join(", ")}. Call list_families or get_leaderboard for names.`) : result({ models: compared });
	});

	server.registerTool(
		"get_model_results",
		{
			title: "Get model results",
			description: "Accuracy, cost, latency and token use for one model, broken down by grid size.",
			inputSchema: z.object({ model: z.string().describe("Model name as listed on the leaderboard, e.g. gpt-5.4-xhigh") }),
			outputSchema: modelOutput,
			annotations: readOnly("Get model results"),
		},
		async ({ model }) => {
			const data = getModel(model);
			return data ? result(data) : failure(`Unknown model "${model}". Call get_leaderboard for model names.`);
		},
	);

	server.registerTool(
		"list_puzzles",
		{
			title: "List puzzles",
			description: "The benchmark puzzles with their ids and row/column clues.",
			inputSchema: z.object({ size }),
			outputSchema: puzzlesOutput,
			annotations: readOnly("List puzzles"),
		},
		async ({ size }) => result({ puzzles: listPuzzles(size) }),
	);

	server.registerTool(
		"get_puzzle",
		{
			title: "Get puzzle",
			description:
				"One puzzle, including the clue text models were prompted with. The reference solution is only included on request; some puzzles have several valid solutions.",
			inputSchema: z.object({
				id: z.string().describe("Puzzle id from list_puzzles"),
				include_solution: z.boolean().optional().describe("Include a reference solution"),
			}),
			outputSchema: puzzleOutput,
			annotations: readOnly("Get puzzle"),
		},
		async ({ id, include_solution }) => {
			const puzzle = getPuzzle(id, include_solution);
			return puzzle ? result(puzzle) : failure(`Unknown puzzle "${id}". Call list_puzzles for ids.`);
		},
	);

	server.registerTool(
		"check_solution",
		{
			title: "Check solution",
			description:
				"Check a grid against a puzzle's clues, using the same rule as the benchmark grader. Reports which rows and columns do not match.",
			inputSchema: z.object({
				id: z.string().describe("Puzzle id from list_puzzles"),
				grid: z.string().describe("Row-major string of 0 (empty) and 1 (filled), width × height characters"),
			}),
			outputSchema: checkOutput,
			annotations: readOnly("Check solution"),
		},
		async ({ id, grid }) => {
			const found = findPuzzle(id);
			return found ? result(checkClues(found.puzzle, grid.replace(/\s/g, ""))) : failure(`Unknown puzzle "${id}".`);
		},
	);

	server.registerTool("get_puzzle_results", {
		title: "Get puzzle results",
		description: "Per-model outcomes for one puzzle. Answers are omitted unless requested.",
		inputSchema: z.object({
			id: z.string().describe("Puzzle id from list_puzzles"),
			provider: z.string().optional().describe("Comma-separated provider ids; empty means no filter"),
			family: z.string().optional().describe("Comma-separated family ids; empty means no filter"),
			effort: z.string().optional().describe("best, all (default), or one effort level"),
			reasoning: reasoningFilter,
			open_weights: openWeightsFilter,
			include_answers: z.boolean().optional().describe("Include each model's answer grid"),
		}),
		outputSchema: puzzleResultsOutput,
		annotations: readOnly("Get puzzle results"),
	}, async ({ id, provider, family, effort, reasoning, open_weights, include_answers }) => {
		if (!getPuzzle(id)) return failure(`Unknown puzzle "${id}".`);
		const filters: Filters = { providers: parseCommaList(provider), families: parseCommaList(family), effort: effort?.trim() || "all", reasoning, openWeights: open_weights };
		const invalid = validateFilters(getVariants().map((model) => ({ ...model, family: model.family ?? model.model, effort: model.effort ?? "none", provider: model.provider ?? "" })), filters, SIZES);
		if (invalid) return failure(invalid);
		const puzzle = (await loadPuzzleResults()).puzzles.find((entry) => entry.id === id);
		if (!puzzle) return failure(`No results for puzzle "${id}".`);
		const selected = filteredModelIds(filters, puzzle.size);
		const runs = puzzle.runs.filter((run) => selected.has(run.model)).map((run) => {
			const model = getVariants().find((entry) => entry.model === run.model);
			const { answer, ...rest } = run;
			return { ...rest, displayName: model?.displayName ?? run.model, family: model?.family ?? run.model, effort: model?.effort ?? null, provider: model?.provider ?? null, ...(include_answers ? { answer } : {}) };
		});
		return result({ updatedAt: RESULTS_TIMESTAMP, puzzleId: id, index: puzzle.index, size: puzzle.size, attempts: runs.length, solved: runs.filter((run) => run.correct).length, runs });
	});

	server.registerTool("get_model_puzzles", {
		title: "Get model puzzles",
		description: "Which puzzles one model solved, missed, timed out on, or has not run.",
		inputSchema: z.object({ model: z.string().describe("Model variant id as listed on the leaderboard, e.g. claude-opus-5.5-high") }), outputSchema: modelPuzzlesOutput, annotations: readOnly("Get model puzzles"),
	}, async ({ model }) => {
		const metadata = getModel(model);
		if (!metadata) return failure(`Unknown model "${model}".`);
		const puzzles = (await loadPuzzleResults()).puzzles.map((puzzle) => {
			const run = puzzle.runs.find((entry) => entry.model === model);
			return { id: puzzle.id, index: puzzle.index, size: puzzle.size, solveRate: puzzle.solveRate, state: runState(run), ...(run ? { correct: run.correct, status: run.status, cost: run.cost, durationMs: run.durationMs } : {}) };
		});
		return result({ model, displayName: metadata.displayName, solved: puzzles.filter((puzzle) => puzzle.state === "solved").length, attempted: puzzles.filter((puzzle) => puzzle.state !== "not-run").length, puzzles });
	});

	server.registerTool(
		"list_runs",
		{
			title: "List runs",
			description:
				"Individual benchmark runs (one model on one puzzle), optionally with the raw prompt and model output.",
			inputSchema: z.object({
				model: z.string().optional().describe("Only runs of this model variant id"),
				puzzle_id: z.string().optional().describe("Only runs on this puzzle id from list_puzzles"),
				size,
				include_output: z.boolean().optional().describe("Include raw prompt and model output (large)"),
				limit: z.number().int().min(1).max(MAX_RUNS_LIMIT).optional().describe("Default 100"),
				offset: z.number().int().min(0).optional().describe("Runs to skip, for paging; default 0"),
			}),
			outputSchema: runsOutput,
			annotations: readOnly("List runs"),
		},
		async ({ model, puzzle_id, size, include_output, limit, offset }) =>
			result(await listRuns({ model, puzzleId: puzzle_id, size, includeOutput: include_output, limit, offset })),
	);

	return server;
}
