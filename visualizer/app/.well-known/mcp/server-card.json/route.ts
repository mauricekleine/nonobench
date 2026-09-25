import { SITE_URL } from "@/lib/data";
import { MCP_SERVER_INFO } from "@/lib/mcp";

// MCP Server Card (SEP-1649, draft).
export function GET() {
	return Response.json({
		$schema: "https://static.modelcontextprotocol.io/schemas/mcp-server-card/v1.json",
		version: "1.0",
		protocolVersion: "2025-06-18",
		serverInfo: MCP_SERVER_INFO,
		description: "Read-only access to Nonobench results, puzzles and a nonogram solution checker.",
		documentationUrl: `${SITE_URL}/llms.txt`,
		transport: { type: "streamable-http", endpoint: `${SITE_URL}/mcp` },
		capabilities: { tools: { listChanged: true } },
		authentication: { required: false },
		tools: ["get_leaderboard", "list_providers", "list_families", "compare_models", "get_model_results", "list_puzzles", "get_puzzle", "check_solution", "list_runs"].map(
			(name) => ({ name }),
		),
	});
}
