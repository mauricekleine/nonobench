import { SITE_URL } from "@/lib/data";

// Agentic Resource Discovery (ARD) manifest.
export function GET() {
	return Response.json({
		specVersion: "1.0",
		host: { displayName: "Nonobench", identifier: "did:web:nonobench.com", documentationUrl: `${SITE_URL}/llms.txt` },
		entries: [
			{
				identifier: "urn:air:nonobench.com:mcp:nonobench",
				displayName: "Nonobench MCP server",
				description: "Leaderboard, per-model results, puzzles and a solution checker for the Nonobench LLM nonogram benchmark.",
				type: "application/mcp-server-card+json",
				url: `${SITE_URL}/.well-known/mcp/server-card.json`,
				representativeQueries: [
					"which LLM is best at solving nonogram puzzles",
					"how accurate is gpt-5.4 on Nonobench",
					"check if my nonogram solution is correct",
				],
			},
			{
				identifier: "urn:air:nonobench.com:api:nonobench",
				displayName: "Nonobench REST API",
				description: "Read-only JSON API over Nonobench results, puzzles and individual runs.",
				type: "application/vnd.oai.openapi+json",
				url: `${SITE_URL}/api/openapi.json`,
				representativeQueries: [
					"LLM reasoning benchmark results as JSON",
					"compare model accuracy on 15x15 nonograms",
					"raw model outputs for a puzzle benchmark",
				],
			},
			{
				identifier: "urn:air:nonobench.com:skill:nonobench",
				displayName: "Nonobench agent skill",
				description: "Instructions for agents on using Nonobench data.",
				type: "text/markdown",
				url: `${SITE_URL}/.well-known/agent-skills/nonobench/SKILL.md`,
				representativeQueries: ["how do I query Nonobench", "nonogram benchmark data for agents"],
			},
		],
	});
}
