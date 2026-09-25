import { getLeaderboard, listPuzzles, RESULTS_TIMESTAMP, SITE_URL, SIZES } from "@/lib/data";

// Markdown served to agents: /llms.txt, the agent skill, and the markdown
// versions of the pages (Accept: text/markdown).

const ACCESS = `## Access the data

No authentication. Everything is read-only.

- REST API: \`${SITE_URL}/api/v1\`. OpenAPI spec: ${SITE_URL}/api/openapi.json
  - \`GET /api/v1/leaderboard?size=10x10\`: models ranked by accuracy
  - \`GET /api/v1/models/{model}\`: one model, per grid size (accuracy, cost, latency, tokens)
  - \`GET /api/v1/puzzles?size=5x5\`: the puzzles with ids and clues
  - \`GET /api/v1/puzzles/{id}?include_solution=true\`: one puzzle and the exact prompt text
  - \`POST /api/v1/puzzles/{id}/check\` with \`{"grid": "0110..."}\`: check a grid against the clues
  - \`GET /api/v1/runs?model=&puzzle=&size=&include_output=true&limit=100&offset=0\`: individual runs
- MCP server (Streamable HTTP, stateless): \`${SITE_URL}/mcp\`. Tools: get_leaderboard, get_model_results, list_puzzles, get_puzzle, check_solution, list_runs
- Bulk downloads: ${SITE_URL}/results-raw.json (every run with prompt and output, ~4 MB)
- Source and benchmark runner: https://github.com/mauricekleine/nonobench`;

const METHOD = `## Method

Each model gets the same system prompt and a puzzle's row and column clues, and must answer with the grid as a string of \`1\` (filled) and \`0\` (empty), row by row. An answer is correct when it satisfies every row and column clue; some puzzles have more than one valid solution. There are 30 puzzles: 10 each of ${SIZES.join(", ")}.`;

export function llmsTxt() {
	return `# NonoBench

> NonoBench is a benchmark of how well large language models solve nonogram (picross) puzzles. Results last updated ${RESULTS_TIMESTAMP}.

${METHOD}

${ACCESS}

## Pages

- [Leaderboard](${SITE_URL}/): results by model and grid size. Also available as markdown at ${SITE_URL}/index.md
- [Puzzle explorer](${SITE_URL}/puzzles): browse the puzzles. Markdown: ${SITE_URL}/puzzles.md
`;
}

export function skillMd() {
	return `---
name: nonobench
description: Look up NonoBench results (how well LLMs solve nonogram/picross puzzles), fetch the benchmark puzzles, and check nonogram solutions. Use when asked how a model performs on NonoBench or on logic puzzles, to compare models on it, or to verify a nonogram grid.
---

# NonoBench

${METHOD}

${ACCESS}

## Tips

- Prefer the MCP server when your client supports it; otherwise use the REST API.
- Model names are ids such as \`gpt-5.4-xhigh\`; the suffix is the reasoning effort. Get the full list from the leaderboard.
- Accuracy is a percentage (0-100). Costs are in USD, as billed through OpenRouter.
- Don't request \`include_output\` unless you need raw model outputs; they are large.
`;
}

function markdownTable(headers: string[], rows: (string | number)[][]) {
	return [
		`| ${headers.join(" | ")} |`,
		`| ${headers.map(() => "---").join(" | ")} |`,
		...rows.map((row) => `| ${row.join(" | ")} |`),
	].join("\n");
}

export function homeMarkdown() {
	const leaderboard = getLeaderboard();
	const bySize = new Map(SIZES.map((size) => [size, new Map(getLeaderboard(size).map((row) => [row.model, row]))]));
	return `# NonoBench leaderboard

How well large language models solve nonogram (picross) puzzles. Results last updated ${RESULTS_TIMESTAMP}.

${markdownTable(
	["Rank", "Model", "Reasoning", "Accuracy", ...SIZES, "Total cost (USD)"],
	leaderboard.map((row) => [
		row.rank,
		row.model,
		row.reasoning ? "yes" : "no",
		`${row.accuracy}% (${row.correct}/${row.total})`,
		...SIZES.map((size) => {
			const entry = bySize.get(size)?.get(row.model);
			return entry ? `${entry.accuracy}%` : "-";
		}),
		row.totalCostUsd.toFixed(2),
	]),
)}

${METHOD}

${ACCESS}
`;
}

export function puzzlesMarkdown() {
	const puzzles = listPuzzles();
	return `# NonoBench puzzles

${puzzles.length} puzzles used by NonoBench. Clues list the lengths of consecutive filled cells, left to right for rows and top to bottom for columns.

${puzzles
	.map(
		(puzzle) => `## Puzzle ${puzzle.index + 1} (${puzzle.size}, id \`${puzzle.id}\`)

- Rows: ${puzzle.rowClues.map((clue) => clue.join(" ")).join(" | ")}
- Columns: ${puzzle.columnClues.map((clue) => clue.join(" ")).join(" | ")}
- Explore: ${puzzle.url}`,
	)
	.join("\n\n")}

Check a solution with \`POST ${SITE_URL}/api/v1/puzzles/{id}/check\` or the MCP tool \`check_solution\`.
`;
}

// Rough token estimate for the x-markdown-tokens header (~4 characters per token).
export function markdownResponse(markdown: string) {
	return new Response(markdown, {
		headers: {
			"Content-Type": "text/markdown; charset=utf-8",
			"x-markdown-tokens": String(Math.ceil(markdown.length / 4)),
			Vary: "Accept",
		},
	});
}
