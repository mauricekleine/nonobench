import { getLeaderboard, listPuzzles, RESULTS_TIMESTAMP, SITE_URL, SIZES } from "@/lib/data";

// Markdown served to agents: /llms.txt, the agent skill, and the markdown
// versions of the pages (Accept: text/markdown).

const ACCESS = `## Access the data

No authentication. Everything is read-only.

- REST API: \`${SITE_URL}/api/v1\`. OpenAPI spec: ${SITE_URL}/api/openapi.json
  - \`GET /api/v1/leaderboard?size=10x10&provider=openai&effort=best\`: models ranked by accuracy. Filters: \`provider\` and \`family\` (comma-separated ids), \`effort\` (best, all, or a level), \`reasoning\` and \`open_weights\` (true/false), \`size\`, \`min_correct\` (non-negative integer). API defaults: effort all, min_correct 0 (includes variants that solved none). Use \`min_correct=1\` to hide them.
  - Empty \`provider\` or \`family\` values mean no filter; spaces around comma-separated ids are ignored. Empty \`effort\` means all. Unknown open-weight status is excluded by both weights filters.
  - \`GET /api/v1/providers\`: provider ids, names and families
  - \`GET /api/v1/families\`: family ids, display names, efforts and best variants
  - \`POST /api/v1/compare\` with \`{"models":["Claude Sonnet 4.5","GLM 5"]}\`: compare family-best variants or exact variant ids
  - \`GET /api/v1/models/{model}\`: one model, per grid size (accuracy, cost, latency, tokens)
  - \`GET /api/v1/models/{model}/puzzles\`: outcomes for all 40 puzzles, including which were solved
  - \`GET /api/v1/puzzles?size=5x5\`: the puzzles with ids and clues
  - \`GET /api/v1/puzzles/{id}?include_solution=true\`: one puzzle and the exact prompt text
  - \`GET /api/v1/puzzles/{id}/results?family=gpt-6-sol&effort=best&include_answers=true\`: per-model outcomes; filters match the leaderboard and answers are opt-in
  - \`POST /api/v1/puzzles/{id}/check\` with \`{"grid": "0110..."}\`: check a grid against the clues
  - \`GET /api/v1/runs?model=&puzzle=&size=&include_output=true&limit=100&offset=0\`: individual runs
- MCP server (Streamable HTTP, stateless): \`${SITE_URL}/mcp\`. Tools: get_leaderboard, list_providers, list_families, compare_models, get_model_results, get_model_puzzles, list_puzzles, get_puzzle, get_puzzle_results, check_solution, list_runs
- Bulk downloads: ${SITE_URL}/results-raw.json (every run with prompt and output, ~4 MB)
- Puzzle outcomes and parsed grids: ${SITE_URL}/puzzle-results.json
- Source and benchmark runner: https://github.com/mauricekleine/nonobench
- Made by [Maurice Kleine](https://www.mauricekleine.com/)`;

const METHOD = `## Method

Each model gets the same system prompt and a puzzle's row and column clues, and must answer with the grid as a string of \`1\` (filled) and \`0\` (empty), row by row. An answer is correct when it satisfies every row and column clue; some puzzles have more than one valid solution. There are 40 puzzles: 10 each of ${SIZES.join(", ")}. The 20x20 tier has not been run yet.`;

export function llmsTxt() {
	return `# Nonobench

> Nonobench is a benchmark of how well large language models solve nonogram (picross) puzzles. Results last updated ${RESULTS_TIMESTAMP}.

${METHOD}

${ACCESS}

## Pages

- [Leaderboard](${SITE_URL}/): results by model and grid size. Also available as markdown at ${SITE_URL}/index.md
- [Puzzle explorer](${SITE_URL}/puzzles): browse the puzzles. Markdown: ${SITE_URL}/puzzles.md
- [Puzzle insights](${SITE_URL}/puzzles/overview): difficulty ranking, model heatmap, and links to answer overlays
`;
}

export function skillMd() {
	return `---
name: nonobench
description: Look up Nonobench results (how well LLMs solve nonogram/picross puzzles), fetch the benchmark puzzles, and check nonogram solutions. Use when asked how a model performs on Nonobench or on logic puzzles, to compare models on it, or to verify a nonogram grid.
---

# Nonobench

${METHOD}

${ACCESS}

## Tips

- Prefer the MCP server when your client supports it; otherwise use the REST API.
- The site defaults to each family's best effort; the REST and MCP leaderboard default to all variants for existing callers. Set \`effort=best\` to match the site.
- The site hides variants that solved no puzzles in the selected tier. REST and MCP include them by default; set \`min_correct=1\` to match the site.
- An effort value of \`default\` means reasoning is on but the model has no adjustable reasoning levels.
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
	return `# Nonobench leaderboard

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
	return `# Nonobench puzzles

${puzzles.length} puzzles used by Nonobench. Clues list the lengths of consecutive filled cells, left to right for rows and top to bottom for columns.

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
