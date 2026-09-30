import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";

// Calls every MCP tool with the same arguments on two deployments through the
// real SDK client, in both protocol eras, and compares tools/list, server
// capabilities and every result: each model, each puzzle and the error cases.
//
//   node tools/mcp-parity.mjs [baseline] [candidate]
//   (defaults: https://www.nonobench.com/mcp https://beta.nonobench.com/mcp)

const [prodUrl = "https://www.nonobench.com/mcp", betaUrl = "https://beta.nonobench.com/mcp"] = process.argv.slice(2);

async function connect(url, modern) {
	const client = new Client({ name: "nonobench-mcp-parity", version: "1.0.0" }, modern ? { versionNegotiation: { mode: { pin: "2026-07-28" } } } : {});
	await client.connect(new StreamableHTTPClientTransport(new URL(url)));
	return client;
}

async function call(client, name, args) {
	try {
		const result = await client.callTool({ name, arguments: args });
		return { isError: result.isError ?? false, content: result.content, structured: result.structuredContent ?? null };
	} catch (error) {
		return { thrown: `${error.code ?? ""} ${error.message}`.trim() };
	}
}

function numericDiffs(a, b, path = "", out = []) {
	if (typeof a === "number" && typeof b === "number") { if (a !== b) out.push(`${path}: ${a} → ${b}`); }
	else if (a && typeof a === "object" && b && typeof b === "object") { for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) numericDiffs(a[key], b[key], `${path}.${key}`, out); }
	else if (JSON.stringify(a) !== JSON.stringify(b)) out.push(`${path}: ${JSON.stringify(a)?.slice(0, 80)} → ${JSON.stringify(b)?.slice(0, 80)}`);
	return out;
}

for (const modern of [true, false]) {
	const [prod, beta] = await Promise.all([connect(prodUrl, modern), connect(betaUrl, modern)]);
	const era = modern ? "2026-07-28" : "2025 (initialize)";
	const [prodTools, betaTools] = await Promise.all([prod.listTools(), beta.listTools()]);
	console.log(`\n## ${era}: server ${JSON.stringify(beta.getServerVersion())}, era ${beta.getProtocolEra()}`);
	console.log(`tools/list: ${betaTools.tools.length} tools, ${JSON.stringify(prodTools) === JSON.stringify(betaTools) ? "identical to the baseline (names, descriptions, input and output schemas, annotations, cache hints)" : "DIFFERS from the baseline"}`);
	console.log(`capabilities identical: ${JSON.stringify(prod.getServerCapabilities()) === JSON.stringify(beta.getServerCapabilities())}; instructions identical: ${prod.getInstructions() === beta.getInstructions()}`);

	const calls = [];
	const add = (name, args) => calls.push([name, args]);
	for (const args of [{}, { size: "5x5" }, { size: "10x10" }, { size: "15x15" }, { size: "20x20" }, { effort: "best" }, { size: "20x20", effort: "best" }, { provider: "openai,anthropic", effort: "best" }, { family: "claude-opus-5.5" }, { version: "1.2" }, { reasoning: true }, { open_weights: true }, { min_correct: 1 }, { effort: "bogus" }, { version: "9.9" }]) add("get_leaderboard", args);
	add("list_providers", {});
	add("list_families", {});
	add("compare_models", { models: ["Claude Opus 5.5", "gpt-6-astra-xhigh", "GLM 5"] });
	add("compare_models", { models: ["not-a-model", "also-not"] });
	if (modern) {
		const board = (await call(beta, "get_leaderboard", {})).structured.models.map((row) => row.model);
		for (const model of board) { add("get_model_results", { model }); add("get_model_puzzles", { model }); }
		const puzzles = (await call(beta, "list_puzzles", {})).structured.puzzles;
		for (const size of [undefined, "5x5", "10x10", "15x15", "20x20"]) add("list_puzzles", size ? { size } : {});
		for (const puzzle of puzzles) {
			add("get_puzzle", { id: puzzle.id, include_solution: true });
			add("get_puzzle_results", { id: puzzle.id, include_answers: true });
			add("check_solution", { id: puzzle.id, grid: "0".repeat(puzzle.width * puzzle.height) });
		}
		const solved = (await call(beta, "get_puzzle", { id: puzzles[5].id, include_solution: true })).structured;
		add("check_solution", { id: solved.id, grid: solved.referenceSolution });
		add("check_solution", { id: puzzles[0].id, grid: "01" });
		add("get_puzzle_results", { id: puzzles[0].id, family: "gpt-6-sol", effort: "best" });
		add("get_puzzle_results", { id: puzzles[0].id, reasoning: true, open_weights: false });
		add("list_runs", { limit: 500, include_output: true });
		add("list_runs", { model: board[0] });
		add("list_runs", { puzzle_id: puzzles[3].id, include_output: true });
		add("list_runs", { size: "20x20", offset: 50, limit: 25 });
	} else {
		add("get_model_results", { model: "claude-opus-5.5-high" });
		add("list_puzzles", { size: "5x5" });
		add("list_runs", { limit: 5 });
	}
	add("get_model_results", { model: "not-a-model" });
	add("get_model_puzzles", { model: "not-a-model" });
	add("get_puzzle", { id: "nope" });
	add("get_puzzle_results", { id: "nope" });
	add("get_puzzle_results", { id: "046ea1e67d21fb59", effort: "bogus" });
	add("check_solution", { id: "nope", grid: "0" });
	add("list_puzzles", { size: "7x7" });
	add("get_leaderboard", { min_correct: -1 });
	add("no_such_tool", {});

	let same = 0;
	const differences = [];
	const errors = { prod: 0, beta: 0 };
	for (let i = 0; i < calls.length; i += 8) {
		await Promise.all(calls.slice(i, i + 8).map(async ([name, args]) => {
			const [a, b] = await Promise.all([call(prod, name, args), call(beta, name, args)]);
			if (a.isError || a.thrown) errors.prod++;
			if (b.isError || b.thrown) errors.beta++;
			if (JSON.stringify(a) === JSON.stringify(b)) { same++; return; }
			const detail = a.thrown || b.thrown ? `${a.thrown ?? "ok"} vs ${b.thrown ?? "ok"}` : numericDiffs(a.structured, b.structured).join("; ") || "text content differs";
			differences.push(`${name} ${JSON.stringify(args).slice(0, 90)}: ${detail}`);
		}));
	}
	console.log(`tools/call: ${calls.length} calls, ${same} identical results (content and structuredContent), ${differences.length} differ; error results baseline ${errors.prod} / candidate ${errors.beta}`);
	for (const line of differences) console.log(`  - ${line}`);
	await Promise.all([prod.close(), beta.close()]);
}
