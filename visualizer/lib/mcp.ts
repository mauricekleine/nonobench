import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import {
	findPuzzle,
	getLeaderboard,
	getModel,
	getPuzzle,
	listPuzzles,
	listRuns,
	MAX_RUNS_LIMIT,
	RESULTS_TIMESTAMP,
	SIZES,
} from "@/lib/data";
import { checkClues } from "@/lib/nonogram";

export const MCP_SERVER_INFO = { name: "nonobench", title: "NonoBench", version: "1.0.0" };

const readOnly = { readOnlyHint: true, openWorldHint: false } as const;

const result = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] });
const failure = (message: string) => ({ content: [{ type: "text" as const, text: message }], isError: true });

const size = z
	.enum(SIZES as [string, ...string[]])
	.optional()
	.describe("Grid size to filter on");

export function createMcpServer() {
	const server = new McpServer(MCP_SERVER_INFO, {
		instructions: `NonoBench measures how well LLMs solve nonogram (picross) puzzles: 30 puzzles across ${SIZES.join(", ")} grids. Accuracy is the share of puzzles where the model's grid satisfies every row and column clue. Results last updated ${RESULTS_TIMESTAMP}.`,
	});

	server.registerTool(
		"get_leaderboard",
		{
			title: "Get leaderboard",
			description: "Models ranked by accuracy on NonoBench, overall or for one grid size.",
			inputSchema: { size },
			annotations: readOnly,
		},
		async ({ size }) => result({ updatedAt: RESULTS_TIMESTAMP, size: size ?? "all", models: getLeaderboard(size) }),
	);

	server.registerTool(
		"get_model_results",
		{
			title: "Get model results",
			description: "Accuracy, cost, latency and token use for one model, broken down by grid size.",
			inputSchema: { model: z.string().describe("Model name as listed on the leaderboard, e.g. gpt-5.4-xhigh") },
			annotations: readOnly,
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
			inputSchema: { size },
			annotations: readOnly,
		},
		async ({ size }) => result(listPuzzles(size)),
	);

	server.registerTool(
		"get_puzzle",
		{
			title: "Get puzzle",
			description:
				"One puzzle, including the clue text models were prompted with. The reference solution is only included on request; some puzzles have several valid solutions.",
			inputSchema: {
				id: z.string().describe("Puzzle id from list_puzzles"),
				include_solution: z.boolean().optional().describe("Include a reference solution"),
			},
			annotations: readOnly,
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
			inputSchema: {
				id: z.string().describe("Puzzle id from list_puzzles"),
				grid: z.string().describe("Row-major string of 0 (empty) and 1 (filled), width × height characters"),
			},
			annotations: readOnly,
		},
		async ({ id, grid }) => {
			const found = findPuzzle(id);
			return found ? result(checkClues(found.puzzle, grid.replace(/\s/g, ""))) : failure(`Unknown puzzle "${id}".`);
		},
	);

	server.registerTool(
		"list_runs",
		{
			title: "List runs",
			description:
				"Individual benchmark runs (one model on one puzzle), optionally with the raw prompt and model output.",
			inputSchema: {
				model: z.string().optional(),
				puzzle_id: z.string().optional(),
				size,
				include_output: z.boolean().optional().describe("Include raw prompt and model output (large)"),
				limit: z.number().int().min(1).max(MAX_RUNS_LIMIT).optional().describe("Default 100"),
				offset: z.number().int().min(0).optional(),
			},
			annotations: readOnly,
		},
		async ({ model, puzzle_id, size, include_output, limit, offset }) =>
			result(await listRuns({ model, puzzleId: puzzle_id, size, includeOutput: include_output, limit, offset })),
	);

	return server;
}
