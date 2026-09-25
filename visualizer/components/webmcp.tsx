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

const sizeSchema = { type: "string", enum: ["5x5", "10x10", "15x15"], description: "Grid size to filter on" };

export function WebMcp() {
	const router = useRouter();

	useEffect(() => {
		const modelContext = (navigator as Navigator & { modelContext?: ModelContext }).modelContext;
		if (!modelContext) return;

		const tools: WebMcpTool[] = [
			{
				name: "get_leaderboard",
				description: "Nonobench models ranked by accuracy at solving nonogram puzzles, overall or for one grid size.",
				inputSchema: { type: "object", properties: { size: sizeSchema } },
				annotations: { readOnlyHint: true },
				execute: ({ size }) => api(`/api/v1/leaderboard${size ? `?size=${encodeURIComponent(String(size))}` : ""}`),
			},
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
					properties: { index: { type: "integer", minimum: 0, description: "0-based puzzle index from list_puzzles" } },
					required: ["index"],
				},
				execute: async ({ index }) => {
					router.push(`/puzzles?puzzle=${Number(index)}`);
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
