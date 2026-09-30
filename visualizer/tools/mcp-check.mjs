import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";

// A real MCP client round trip against a deployment: connect with the 2026
// protocol and with 2025 initialize, list the tools, and call two of them.
//
//   node tools/mcp-check.mjs [url]   (default: https://beta.nonobench.com/mcp)

const url = new URL(process.argv[2] ?? "https://beta.nonobench.com/mcp");

async function connect(modern) {
	const client = new Client({ name: "nonobench-mcp-check", version: "1.0.0" }, modern ? { versionNegotiation: { mode: { pin: "2026-07-28" } } } : {});
	await client.connect(new StreamableHTTPClientTransport(url));
	return client;
}

const text = (result) => JSON.parse(result.content[0].text);

for (const modern of [true, false]) {
	const started = performance.now();
	const client = await connect(modern);
	const { tools } = await client.listTools();
	const leaderboard = await client.callTool({ name: "get_leaderboard", arguments: { size: "15x15", effort: "best", min_correct: 1 } });
	if (leaderboard.isError) throw new Error(`get_leaderboard failed: ${leaderboard.content[0]?.text}`);
	const { puzzles } = text(await client.callTool({ name: "list_puzzles", arguments: { size: "5x5" } }));
	const check = await client.callTool({ name: "check_solution", arguments: { id: puzzles[0].id, grid: "0".repeat(25) } });
	const board = text(leaderboard);
	console.log(`## ${url.href}: ${client.getProtocolEra()} era (${modern ? "2026-07-28, no initialize" : "2025 initialize"}), ${Math.round(performance.now() - started)} ms\n`);
	console.log(`server: ${JSON.stringify(client.getServerVersion())}`);
	console.log(`tools/list: ${tools.length} tools: ${tools.map((tool) => tool.name).join(", ")}`);
	console.log(`tools/call get_leaderboard {size: "15x15", effort: "best", min_correct: 1}: updatedAt ${board.updatedAt}, ${board.models.length} models, top 3:`);
	for (const row of board.models.slice(0, 3)) console.log(`  ${row.rank}. ${row.model}: ${row.accuracy}% (${row.correct}/${row.total}), $${row.totalCostUsd}`);
	console.log(`tools/call check_solution {id: "${puzzles[0].id}", grid: "000…0"}: ${JSON.stringify(check.structuredContent).slice(0, 160)}…\n`);
	await client.close();
}
