import { SITE_URL, SIZES } from "@/lib/data";

const sizeParam = {
	name: "size",
	in: "query",
	required: false,
	description: "Only include this grid size.",
	schema: { type: "string", enum: SIZES },
};
const leaderboardParams = [
	sizeParam,
	{ name: "provider", in: "query", description: "Comma-separated provider ids from /api/v1/providers. Empty values mean no filter; surrounding spaces are ignored.", schema: { type: "string" } },
	{ name: "family", in: "query", description: "Comma-separated family ids from /api/v1/families. Empty values mean no filter; surrounding spaces are ignored.", schema: { type: "string" } },
	{ name: "effort", in: "query", description: "best, all, or a specific effort level. Omitted or empty defaults to all for backwards compatibility.", schema: { type: "string", default: "all" } },
	{ name: "reasoning", in: "query", description: "true includes only reasoning variants; false includes only non-reasoning variants.", schema: { type: "boolean" } },
	{ name: "open_weights", in: "query", description: "true includes only verified open-weight models; false includes only proprietary models. Unknown weights are excluded by both.", schema: { type: "boolean" } },
];

const error = { description: "Error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } };

const json = (description: string, schema: object) => ({ description, content: { "application/json": { schema } } });

const spec = {
	openapi: "3.1.0",
	info: {
		title: "Nonobench API",
		version: "1.0.0",
		description:
			"Read-only access to Nonobench, a benchmark of how well LLMs solve nonogram (picross) puzzles. No authentication; please cache responses, the data only changes when new models are benchmarked.",
		license: { name: "See repository", url: "https://github.com/mauricekleine/nonobench" },
	},
	servers: [{ url: SITE_URL }],
	externalDocs: { description: "Guide for agents", url: `${SITE_URL}/llms.txt` },
	paths: {
		"/api/v1/leaderboard": {
			get: {
				operationId: "getLeaderboard",
				summary: "Models ranked by accuracy",
				parameters: leaderboardParams,
				responses: { "200": json("Leaderboard", { $ref: "#/components/schemas/Leaderboard" }), "400": error },
			},
		},
		"/api/v1/providers": { get: { operationId: "listProviders", summary: "Discover providers, families and variant counts", responses: { "200": json("Providers", { type: "object", properties: { providers: { type: "array", items: { type: "object", properties: { id: { type: "string" }, name: { type: "string" }, families: { type: "array", items: { type: "string" } }, variantCount: { type: "integer" } } } } } }) } } },
		"/api/v1/families": { get: { operationId: "listFamilies", summary: "Discover model families, efforts and best variants", responses: { "200": json("Families", { type: "object", properties: { families: { type: "array", items: { type: "object", properties: { family: { type: "string" }, displayName: { type: "string" }, provider: { type: "string" }, efforts: { type: "array", items: { type: "string" } }, bestVariant: { type: "string" } } } } } }) } } },
		"/api/v1/compare": { post: { operationId: "compareModels", summary: "Compare model IDs or family names using each family's best variant", requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["models"], properties: { models: { type: "array", minItems: 2, maxItems: 20, items: { type: "string" } } } } } } }, responses: { "200": json("Model comparison", { type: "object", properties: { models: { type: "array", items: { $ref: "#/components/schemas/Model" } } } }), "400": error } } },
		"/api/v1/models/{model}": {
			get: {
				operationId: "getModel",
				summary: "Results for one model, broken down by grid size",
				parameters: [{ name: "model", in: "path", required: true, schema: { type: "string" }, example: "gpt-5.4-xhigh" }],
				responses: { "200": json("Model results", { $ref: "#/components/schemas/Model" }), "404": error },
			},
		},
		"/api/v1/models/{model}/puzzles": { get: {
			operationId: "getModelPuzzles", summary: "Puzzle outcomes for one model, including solved puzzle ids",
			parameters: [{ name: "model", in: "path", required: true, schema: { type: "string" } }],
			responses: { "200": json("Model puzzle outcomes", { $ref: "#/components/schemas/ModelPuzzles" }), "404": error },
		} },
		"/api/v1/puzzles": {
			get: {
				operationId: "listPuzzles",
				summary: "The 40 benchmark puzzles with their clues",
				parameters: [sizeParam],
				responses: {
					"200": json("Puzzles", {
						type: "object",
						properties: { puzzles: { type: "array", items: { $ref: "#/components/schemas/Puzzle" } } },
					}),
					"400": error,
				},
			},
		},
		"/api/v1/puzzles/{id}": {
			get: {
				operationId: "getPuzzle",
				summary: "One puzzle, including the exact clue text models were prompted with",
				parameters: [
					{ name: "id", in: "path", required: true, schema: { type: "string" } },
					{
						name: "include_solution",
						in: "query",
						required: false,
						description: "Include a reference solution. Some puzzles have more than one valid solution.",
						schema: { type: "boolean", default: false },
					},
				],
				responses: { "200": json("Puzzle", { $ref: "#/components/schemas/PuzzleDetail" }), "404": error },
			},
		},
		"/api/v1/puzzles/{id}/check": {
			post: {
				operationId: "checkSolution",
				summary: "Check whether a grid satisfies every row and column clue",
				parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: {
								type: "object",
								required: ["grid"],
								properties: {
									grid: {
										type: "string",
										description: "Row-major string of 0 (empty) and 1 (filled), width × height characters.",
									},
								},
							},
						},
					},
				},
				responses: { "200": json("Check result", { $ref: "#/components/schemas/ClueCheck" }), "400": error, "404": error },
			},
		},
		"/api/v1/puzzles/{id}/results": { get: {
			operationId: "getPuzzleResults", summary: "Per-model results for one puzzle",
			parameters: [
				{ name: "id", in: "path", required: true, schema: { type: "string" } },
				...leaderboardParams.filter((param) => param.name !== "size"),
				{ name: "include_answers", in: "query", description: "Include each model's parsed 0/1 grid when available.", schema: { type: "boolean", default: false } },
			],
			responses: { "200": json("Puzzle results", { $ref: "#/components/schemas/PuzzleResults" }), "400": error, "404": error },
		} },
		"/api/v1/runs": {
			get: {
				operationId: "listRuns",
				summary: "Individual benchmark runs, optionally with the raw prompt and model output",
				parameters: [
					{ name: "model", in: "query", required: false, schema: { type: "string" } },
					{ name: "puzzle", in: "query", required: false, description: "Puzzle id.", schema: { type: "string" } },
					sizeParam,
					{ name: "include_output", in: "query", required: false, schema: { type: "boolean", default: false } },
					{ name: "limit", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 500, default: 100 } },
					{ name: "offset", in: "query", required: false, schema: { type: "integer", minimum: 0, default: 0 } },
				],
				responses: { "200": json("Runs", { $ref: "#/components/schemas/RunPage" }), "400": error },
			},
		},
		"/api/health": {
			get: {
				operationId: "health",
				summary: "Health check",
				responses: {
					"200": json("Healthy", {
						type: "object",
						properties: { status: { type: "string" }, resultsUpdatedAt: { type: "string", format: "date-time" } },
					}),
				},
			},
		},
	},
	components: {
		schemas: {
			Error: { type: "object", properties: { error: { type: "string" } } },
			PuzzleResults: { type: "object", properties: {
				updatedAt: { type: "string", format: "date-time" }, puzzleId: { type: "string" }, index: { type: "integer" }, size: { type: "string" }, attempts: { type: "integer" }, solved: { type: "integer" },
				runs: { type: "array", items: { type: "object", properties: { model: { type: "string" }, displayName: { type: "string" }, family: { type: "string" }, effort: { type: ["string", "null"] }, provider: { type: ["string", "null"] }, status: { type: "string", enum: ["success", "timeout"] }, correct: { type: "boolean" }, answer: { type: ["string", "null"], description: "Only present when include_answers=true." }, tokens: { type: "integer" }, cost: { type: "number" }, durationMs: { type: "number" } } } },
			} },
			ModelPuzzles: { type: "object", properties: { model: { type: "string" }, displayName: { type: "string" }, solved: { type: "integer" }, attempted: { type: "integer" }, puzzles: { type: "array", items: { type: "object", properties: { id: { type: "string" }, index: { type: "integer" }, size: { type: "string" }, solveRate: { type: "number" }, state: { type: "string", enum: ["solved", "wrong", "cut-off", "not-run"] }, correct: { type: "boolean" }, status: { type: "string" }, cost: { type: "number" }, durationMs: { type: "number" } } } } } },
			Leaderboard: {
				type: "object",
				properties: {
					updatedAt: { type: "string", format: "date-time" },
					size: { type: "string" },
					models: {
						type: "array",
						items: {
							type: "object",
							properties: {
								rank: { type: "integer" },
								model: { type: "string" },
								displayName: { type: "string" },
								familyDisplayName: { type: "string" },
								providerName: { type: "string" },
								openWeights: { type: ["boolean", "null"], description: "null means unknown; excluded by both open_weights=true and open_weights=false." },
								addedAt: { type: ["string", "null"], format: "date-time" },
								family: { type: "string", description: "Underlying model; variants differ only in reasoning effort." },
								effort: { type: ["string", "null"], description: "Reasoning effort of this variant (none, minimal, low, medium, high, xhigh, default)." },
								provider: { type: ["string", "null"], description: "OpenRouter provider prefix, e.g. openai or anthropic." },
								earlierBatch: { type: "boolean", description: "True for runs from the original benchmark batch." },
								complete: { type: "boolean", description: "False when not every core puzzle has a finished run." },
								providerTimeouts: { type: "integer", description: "Core puzzles cut off by a provider time limit; counted as unsolved. Present only when non-zero." },
								providerTimeoutNote: { type: ["string", "null"] },
								reasoning: { type: "boolean" },
								accuracy: { type: "number", description: "Percentage of puzzles solved (0-100); without a size, over the core 5x5-15x15 tier." },
								correct: { type: "integer" },
								total: { type: "integer" },
								totalCostUsd: { type: "number" },
							},
						},
					},
				},
			},
			Model: {
				type: "object",
				properties: {
					model: { type: "string" },
					displayName: { type: "string" },
					familyDisplayName: { type: "string" },
					providerName: { type: "string" },
					openWeights: { type: ["boolean", "null"], description: "null means unknown; excluded by both open_weights=true and open_weights=false." },
					addedAt: { type: ["string", "null"], format: "date-time" },
					family: { type: "string", description: "Underlying model; variants differ only in reasoning effort." },
					effort: { type: ["string", "null"], description: "Reasoning effort of this variant (none, minimal, low, medium, high, xhigh, default)." },
					provider: { type: ["string", "null"], description: "OpenRouter provider prefix, e.g. openai or anthropic." },
					earlierBatch: { type: "boolean", description: "True for runs from the original benchmark batch." },
					complete: { type: "boolean", description: "False when not every core puzzle has a finished run." },
					providerTimeouts: { type: "integer", description: "Core puzzles cut off by a provider time limit; counted as unsolved. Present only when non-zero." },
					providerTimeoutNote: { type: ["string", "null"] },
					reasoning: { type: "boolean" },
					accuracy: { type: "number" },
					correct: { type: "integer" },
					total: { type: "integer" },
					failedRuns: { type: "integer" },
					bySize: {
						type: "array",
						items: {
							type: "object",
							properties: {
								size: { type: "string" },
								accuracy: { type: "number" },
								correct: { type: "integer" },
								total: { type: "integer" },
								failedRuns: { type: "integer" },
								avgDurationMs: { type: "integer" },
								avgTokens: { type: "integer" },
								avgCostUsd: { type: "number" },
								totalCostUsd: { type: "number" },
							},
						},
					},
				},
			},
			Puzzle: {
				type: "object",
				properties: {
					id: { type: "string" },
					index: { type: "integer" },
					size: { type: "string" },
					width: { type: "integer" },
					height: { type: "integer" },
					rowClues: { type: "array", items: { type: "array", items: { type: "integer" } } },
					columnClues: { type: "array", items: { type: "array", items: { type: "integer" } } },
					url: { type: "string", format: "uri" },
				},
			},
			PuzzleDetail: {
				allOf: [
					{ $ref: "#/components/schemas/Puzzle" },
					{
						type: "object",
						properties: { prompt: { type: "string" }, referenceSolution: { type: "string" } },
					},
				],
			},
			ClueCheck: {
				type: "object",
				properties: {
					correct: { type: "boolean" },
					error: { type: "string" },
					rowViolations: { type: "array", items: { $ref: "#/components/schemas/LineViolation" } },
					columnViolations: { type: "array", items: { $ref: "#/components/schemas/LineViolation" } },
				},
			},
			LineViolation: {
				type: "object",
				properties: {
					index: { type: "integer", description: "1-based row or column number." },
					expected: { type: "string" },
					actual: { type: "string" },
				},
			},
			RunPage: {
				type: "object",
				properties: {
					total: { type: "integer" },
					limit: { type: "integer" },
					offset: { type: "integer" },
					runs: {
						type: "array",
						items: {
							type: "object",
							properties: {
								model: { type: "string" },
								puzzleId: { type: "string" },
								size: { type: "string" },
								timestamp: { type: "string", format: "date-time" },
								reasoning: { type: "boolean" },
								correct: { type: "boolean" },
								status: { type: "string" },
								durationMs: { type: "number" },
								tokens: { type: "integer" },
								cost: { type: "number" },
								errorMessage: { type: ["string", "null"] },
								rawInput: { type: "string" },
								rawOutput: { type: ["string", "null"] },
							},
						},
					},
				},
			},
		},
	},
};

export function GET() {
	return Response.json(spec);
}
