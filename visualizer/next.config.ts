import type { NextConfig } from "next";

const acceptsMarkdown = [{ type: "header" as const, key: "accept", value: "(.*)text/markdown(.*)" }];

// RFC 8288 Link header pointing agents at the machine-readable entry points.
const agentLinks = [
	'</.well-known/api-catalog>; rel="api-catalog"',
	'</api/openapi.json>; rel="service-desc"; type="application/json"',
	'</llms.txt>; rel="service-doc"; type="text/plain"',
	'</.well-known/mcp/server-card.json>; rel="describedby"; type="application/json"',
	'</sitemap.xml>; rel="sitemap"; type="application/xml"',
].join(", ");

const nextConfig: NextConfig = {
	async rewrites() {
		// Markdown for agents: same URL, markdown when the client asks for it.
		return {
			beforeFiles: [
				{ source: "/", has: acceptsMarkdown, destination: "/index.md" },
				{ source: "/puzzles", has: acceptsMarkdown, destination: "/puzzles.md" },
			],
		};
	},
	async headers() {
		const cors = [{ key: "Access-Control-Allow-Origin", value: "*" }];
		return [
			{
				source: "/",
				headers: [{ key: "Link", value: `${agentLinks}, </index.md>; rel="alternate"; type="text/markdown"` }],
			},
			{
				source: "/puzzles",
				headers: [{ key: "Link", value: `${agentLinks}, </puzzles.md>; rel="alternate"; type="text/markdown"` }],
			},
			{ source: "/api/:path*", headers: cors },
			{ source: "/.well-known/:path*", headers: cors },
			{ source: "/mcp", headers: cors },
			{ source: "/llms.txt", headers: cors },
			{ source: "/results-raw.json", headers: cors },
		];
	},
};

export default nextConfig;
