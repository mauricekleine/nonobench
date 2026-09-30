import { createHash } from "node:crypto";
import { SUPPORTED_PROTOCOL_VERSIONS } from "@modelcontextprotocol/server";

import { homeMarkdown, llmsTxt, markdownResponse, puzzlesMarkdown, skillMd } from "@/lib/agent-docs";
import { RESULTS_TIMESTAMP, SITE_URL } from "@/lib/data";
import { MCP_SERVER_INFO } from "@/lib/mcp";

// Discovery surfaces for agents and crawlers: llms.txt, the markdown twins of
// the pages, robots.txt, the sitemap and the /.well-known documents.

const text = (body: string, contentType: string, cacheControl?: string) =>
	new Response(body, { headers: { "Content-Type": contentType, ...(cacheControl ? { "Cache-Control": cacheControl } : {}) } });

export const llms = () => text(llmsTxt(), "text/plain; charset=utf-8");
export const homeMd = () => markdownResponse(homeMarkdown());
export const puzzlesMd = () => markdownResponse(puzzlesMarkdown());
export const skill = () => markdownResponse(skillMd());

// Hand-written rather than generated because robots metadata has no field for
// Content-Signal. ai-train=no keeps the published puzzles and answers out of
// training sets, which would contaminate the benchmark.
const CONTENT_SIGNAL = "Content-Signal: search=yes, ai-input=yes, ai-train=no";

const AI_CRAWLERS = [
	"GPTBot",
	"OAI-SearchBot",
	"ChatGPT-User",
	"ClaudeBot",
	"Claude-Web",
	"Claude-SearchBot",
	"Claude-User",
	"Google-Extended",
	"PerplexityBot",
	"Perplexity-User",
	"Applebot-Extended",
	"CCBot",
	"meta-externalagent",
	"Bytespider",
];

const ROBOTS_TXT = `# Nonobench: LLM nonogram benchmark. Agents: see ${SITE_URL}/llms.txt

User-agent: *
${CONTENT_SIGNAL}
Allow: /

# AI crawlers may read and cite everything; the Content-Signal asks that the
# content is not used for model training.
${AI_CRAWLERS.map((agent) => `User-agent: ${agent}`).join("\n")}
${CONTENT_SIGNAL}
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;

export const robots = () => text(ROBOTS_TXT, "text/plain; charset=utf-8", "max-age=14400, s-maxage=31536000");

const SITEMAP = [
	{ path: "/", changeFrequency: "weekly", priority: 1 },
	{ path: "/how-it-works", changeFrequency: "monthly", priority: 0.7 },
	{ path: "/puzzles", changeFrequency: "monthly", priority: 0.7 },
	{ path: "/privacy", changeFrequency: "yearly", priority: 0.2 },
	{ path: "/llms.txt", changeFrequency: "weekly", priority: 0.5 },
];

export function sitemap() {
	const urls = SITEMAP.map(
		(entry) =>
			`<url>\n<loc>${SITE_URL}${entry.path}</loc>\n<lastmod>${RESULTS_TIMESTAMP}</lastmod>\n<changefreq>${entry.changeFrequency}</changefreq>\n<priority>${entry.priority}</priority>\n</url>`,
	);
	return text(
		`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`,
		"application/xml",
		"public, max-age=0, must-revalidate",
	);
}

// RFC 9727 API catalog.
export function apiCatalog() {
	return text(
		JSON.stringify({
			linkset: [
				{
					anchor: `${SITE_URL}/api/v1`,
					"service-desc": [{ href: `${SITE_URL}/api/openapi.json`, type: "application/json" }],
					"service-doc": [{ href: `${SITE_URL}/llms.txt`, type: "text/plain" }],
					status: [{ href: `${SITE_URL}/api/health`, type: "application/json" }],
				},
			],
		}),
		'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"',
	);
}

// Agentic Resource Discovery (ARD) manifest.
export function aiCatalog() {
	return Response.json({
		specVersion: "1.0",
		host: { displayName: "Nonobench", identifier: "did:web:nonobench.com", documentationUrl: `${SITE_URL}/llms.txt` },
		entries: [
			{
				identifier: "urn:air:nonobench.com:mcp:nonobench",
				displayName: "Nonobench MCP server",
				description: "Filtered leaderboard, provider and family discovery, model comparison, puzzles and a solution checker for the Nonobench LLM nonogram benchmark.",
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
				description: "Read-only JSON API over filtered Nonobench results, provider and family discovery, puzzles and individual runs.",
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

// Agent Skills Discovery RFC v0.2.0.
export function agentSkills() {
	return Response.json({
		$schema: "https://schemas.agentskills.io/discovery/0.2.0/schema.json",
		skills: [
			{
				name: "nonobench",
				type: "skill-md",
				description:
					"Look up Nonobench results (how well LLMs solve nonogram puzzles), fetch the benchmark puzzles, and check nonogram solutions.",
				url: `${SITE_URL}/.well-known/agent-skills/nonobench/SKILL.md`,
				digest: `sha256:${createHash("sha256").update(skillMd()).digest("hex")}`,
			},
		],
	});
}

// MCP Server Card (SEP-1649, draft).
export function mcpServerCard() {
	return Response.json({
		$schema: "https://static.modelcontextprotocol.io/schemas/mcp-server-card/v1.json",
		version: "1.0",
		protocolVersion: "2026-07-28",
		protocolVersions: ["2026-07-28", ...SUPPORTED_PROTOCOL_VERSIONS],
		serverInfo: MCP_SERVER_INFO,
		description: "Read-only access to Nonobench results, puzzles and a nonogram solution checker.",
		documentationUrl: `${SITE_URL}/llms.txt`,
		transport: { type: "streamable-http", endpoint: `${SITE_URL}/mcp` },
		capabilities: { tools: { listChanged: false } },
		authentication: { required: false },
		tools: [
			"get_leaderboard",
			"list_providers",
			"list_families",
			"compare_models",
			"get_model_results",
			"get_model_puzzles",
			"list_puzzles",
			"get_puzzle",
			"get_puzzle_results",
			"check_solution",
			"list_runs",
		].map((name) => ({ name })),
	});
}
