"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// WebMCP: exposes the site's actions to AI agents running in the browser.
// The API is still a draft, so both the registerTool and the older
// provideContext shapes are supported and missing support is a no-op.

type WebMcpTool = {
	name: string;
	description: string;
	inputSchema: object;
	annotations?: { readOnlyHint?: boolean };
	execute: (input: Record<string, unknown>) => Promise<{ content: { type: "text"; text: string }[] }>;
};

type ModelContext = {
	registerTool?: (tool: WebMcpTool, options?: { signal?: AbortSignal }) => { unregister?: () => void } | void;
	provideContext?: (context: { tools: WebMcpTool[] }) => void;
	clearContext?: () => void;
};

const text = (data: unknown) => ({
	content: [{ type: "text" as const, text: typeof data === "string" ? data : JSON.stringify(data, null, 2) }],
});

async function api(path: string, init?: RequestInit) {
	const response = await fetch(path, init);
	return text(await response.json());
}

const sizeSchema = { type: "string", enum: ["5x5", "10x10", "15x15", "20x20"], description: "Grid size to filter on" };
const filterProperties = { size: sizeSchema, provider: { type: "string", description: "Comma-separated provider ids" }, family: { type: "string", description: "Comma-separated family ids" }, effort: { type: "string", description: "best, all, or an effort level" }, reasoning: { type: "boolean" }, open_weights: { type: "boolean" } };
function query(input: Record<string, unknown>) { const params = new URLSearchParams(); for (const key of Object.keys(filterProperties)) if (input[key] !== undefined) params.set(key, String(input[key])); return params; }

export function WebMcp() {
	const router = useRouter();

	useEffect(() => {
		const modelContext = (navigator as Navigator & { modelContext?: ModelContext }).modelContext;
		if (!modelContext) return;

		const tools: WebMcpTool[] = [
			{
				name: "get_leaderboard",
				description: "Nonobench models ranked by accuracy, overall or for one grid size. Effort defaults to all levels; use effort=best to match the homepage.",
				inputSchema: { type: "object", properties: filterProperties },
				annotations: { readOnlyHint: true },
				execute: (input) => api(`/api/v1/leaderboard?${query(input)}`),
			},
			{ name: "list_providers", description: "Provider ids, names, families and variant counts.", inputSchema: { type: "object", properties: {} }, annotations: { readOnlyHint: true }, execute: () => api("/api/v1/providers") },
			{ name: "list_families", description: "Model families, efforts and best variants.", inputSchema: { type: "object", properties: {} }, annotations: { readOnlyHint: true }, execute: () => api("/api/v1/families") },
			{ name: "compare_models", description: "Compare two or more model ids or family names side by side.", inputSchema: { type: "object", properties: { models: { type: "array", items: { type: "string" }, minItems: 2 } }, required: ["models"] }, annotations: { readOnlyHint: true }, execute: ({ models }) => api("/api/v1/compare", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ models }) }) },
			{ name: "set_filters", description: "Update the visible leaderboard filters and URL.", inputSchema: { type: "object", properties: filterProperties }, execute: async (input) => {
				const response = await fetch(`/api/v1/leaderboard?${query(input)}`);
				if (!response.ok) return text(await response.json());
				const params = new URLSearchParams();
				for (const [apiKey, urlKey] of [["provider", "p"], ["family", "f"], ["effort", "e"], ["reasoning", "r"], ["open_weights", "w"], ["size", "s"]]) if (input[apiKey] !== undefined && input[apiKey] !== "best") params.set(urlKey, String(input[apiKey]));
				router.push(`/${params.size ? `?${params}` : ""}`);
				return text(`Updated leaderboard filters: ${params}`);
			} },
			{
				name: "get_model_results",
				description: "Accuracy, cost and latency for one model, per grid size.",
				inputSchema: {
					type: "object",
					properties: { model: { type: "string", description: "Model name from the leaderboard" } },
					required: ["model"],
				},
				annotations: { readOnlyHint: true },
				execute: ({ model }) => api(`/api/v1/models/${encodeURIComponent(String(model))}`),
			},
			{
				name: "list_puzzles",
				description: "The benchmark puzzles with ids and row/column clues.",
				inputSchema: { type: "object", properties: { size: sizeSchema } },
				annotations: { readOnlyHint: true },
				execute: ({ size }) => api(`/api/v1/puzzles${size ? `?size=${encodeURIComponent(String(size))}` : ""}`),
			},
			{
				name: "get_puzzle_results", description: "Per-model outcomes for a puzzle, optionally including parsed grids.",
				inputSchema: { type: "object", properties: { id: { type: "string" }, ...filterProperties, include_answers: { type: "boolean" } }, required: ["id"] },
				annotations: { readOnlyHint: true },
				execute: ({ id, include_answers, ...filters }) => { const params = query(filters); if (include_answers !== undefined) params.set("include_answers", String(include_answers)); return api(`/api/v1/puzzles/${encodeURIComponent(String(id))}/results?${params}`); },
			},
			{
				name: "get_model_puzzles", description: "Which puzzles a model solved, missed, or did not run.",
				inputSchema: { type: "object", properties: { model: { type: "string" } }, required: ["model"] },
				annotations: { readOnlyHint: true }, execute: ({ model }) => api(`/api/v1/models/${encodeURIComponent(String(model))}/puzzles`),
			},
			{
				name: "check_solution",
				description: "Check a nonogram grid (row-major 0/1 string) against a puzzle's clues.",
				inputSchema: {
					type: "object",
					properties: { id: { type: "string", description: "Puzzle id" }, grid: { type: "string" } },
					required: ["id", "grid"],
				},
				annotations: { readOnlyHint: true },
				execute: ({ id, grid }) =>
					api(`/api/v1/puzzles/${encodeURIComponent(String(id))}/check`, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ grid }),
					}),
			},
			{
				name: "open_puzzle",
				description: "Show a puzzle in the puzzle explorer on this page.",
				inputSchema: {
					type: "object",
					properties: { index: { type: "integer", minimum: 0, maximum: 39, description: "0-based puzzle index from list_puzzles" }, model: { type: "string", description: "Optional model variant to show its answer overlay" } },
					required: ["index"],
				},
				execute: async ({ index, model }) => {
					if (!Number.isInteger(Number(index)) || Number(index) < 0 || Number(index) > 39) return text("Puzzle index must be 0 through 39.");
					router.push(`/puzzles?puzzle=${Number(index)}${model ? `&model=${encodeURIComponent(String(model))}` : ""}`);
					return text(`Opened puzzle ${Number(index)}.`);
				},
			},
		];

		if (modelContext.registerTool) {
			const controller = new AbortController();
			const registrations = tools.map((tool) => modelContext.registerTool?.(tool, { signal: controller.signal }));
			return () => {
				controller.abort();
				for (const registration of registrations) registration?.unregister?.();
			};
		}
		modelContext.provideContext?.({ tools });
		return () => modelContext.clearContext?.();
	}, [router]);

	return null;
}
