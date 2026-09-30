import { bindAssets, type AssetFetcher } from "@/lib/assets";

import * as agent from "./agent";
import * as api from "./api";
import { handleMcp } from "./mcp";
import { openApiSpec } from "./openapi";

// Everything the Worker does before a request reaches the static assets or
// the page renderer: the agent and API routes, the MCP server, markdown
// negotiation, and the response headers the site has always sent.

export type SiteEnv = { ASSETS: AssetFetcher };
export type RenderPage = (request: Request) => Response | Promise<Response>;

type Handler = (request: Request, params: Record<string, string>) => Response | Promise<Response>;
type Route = { path: string; GET?: Handler; POST?: Handler };

const ROUTES: Route[] = [
	{ path: "/api/health", GET: api.health },
	{ path: "/api/openapi.json", GET: openApiSpec },
	{ path: "/api/v1/leaderboard", GET: api.leaderboard },
	{ path: "/api/v1/providers", GET: api.providers },
	{ path: "/api/v1/families", GET: api.families },
	{ path: "/api/v1/compare", POST: api.compare },
	{ path: "/api/v1/models/:model", GET: api.model },
	{ path: "/api/v1/models/:model/puzzles", GET: api.modelPuzzles },
	{ path: "/api/v1/puzzles", GET: api.puzzles },
	{ path: "/api/v1/puzzles/:id", GET: api.puzzle },
	{ path: "/api/v1/puzzles/:id/check", POST: api.checkPuzzle },
	{ path: "/api/v1/puzzles/:id/results", GET: api.puzzleResults },
	{ path: "/api/v1/runs", GET: api.runs },
	{ path: "/llms.txt", GET: agent.llms },
	{ path: "/index.md", GET: agent.homeMd },
	{ path: "/puzzles.md", GET: agent.puzzlesMd },
	{ path: "/robots.txt", GET: agent.robots },
	{ path: "/sitemap.xml", GET: agent.sitemap },
	{ path: "/.well-known/api-catalog", GET: agent.apiCatalog },
	{ path: "/.well-known/ai-catalog.json", GET: agent.aiCatalog },
	{ path: "/.well-known/agent-skills/index.json", GET: agent.agentSkills },
	{ path: "/.well-known/agent-skills/nonobench/SKILL.md", GET: agent.skill },
	{ path: "/.well-known/mcp/server-card.json", GET: agent.mcpServerCard },
];

function matchRoute(pathname: string) {
	const segments = pathname.split("/");
	for (const route of ROUTES) {
		const pattern = route.path.split("/");
		if (pattern.length !== segments.length) continue;
		const params: Record<string, string> = {};
		const matched = pattern.every((part, index) => {
			if (part.startsWith(":")) {
				try {
					params[part.slice(1)] = decodeURIComponent(segments[index]);
				} catch {
					return false;
				}
				return segments[index] !== "";
			}
			return part === segments[index];
		});
		if (matched) return { route, params };
	}
	return null;
}

// Route handler semantics: HEAD runs GET without a body, OPTIONS lists the
// allowed methods, and any other method is 405.
async function dispatch(request: Request, route: Route, params: Record<string, string>) {
	const methods = (["GET", "POST"] as const).filter((method) => route[method]);
	const handler = request.method === "HEAD" ? route.GET : route[request.method as "GET" | "POST"];
	if (handler) {
		const response = await handler(request, params);
		return request.method === "HEAD" ? new Response(null, response) : response;
	}
	if (request.method === "OPTIONS") {
		const allow = [...methods, ...(route.GET ? ["HEAD"] : []), "OPTIONS"].sort();
		return new Response(null, { status: 204, headers: { Allow: allow.join(", ") } });
	}
	return new Response(null, { status: 405 });
}

// Markdown for agents: the same URL answers in markdown when asked.
const MARKDOWN_TWINS: Record<string, string> = { "/": "/index.md", "/puzzles": "/puzzles.md" };

// RFC 8288 Link header pointing agents at the machine-readable entry points.
const AGENT_LINKS = [
	'</.well-known/api-catalog>; rel="api-catalog"',
	'</api/openapi.json>; rel="service-desc"; type="application/json"',
	'</llms.txt>; rel="service-doc"; type="text/plain"',
	'</.well-known/mcp/server-card.json>; rel="describedby"; type="application/json"',
	'</sitemap.xml>; rel="sitemap"; type="application/xml"',
].join(", ");

const PUBLIC_CORS = (pathname: string) =>
	pathname === "/api" ||
	pathname.startsWith("/api/") ||
	pathname.startsWith("/.well-known/") ||
	pathname === "/llms.txt" ||
	pathname === "/results-raw.json";

// Only the canonical hosts may be indexed; beta and previews send noindex.
const INDEXABLE_HOSTS = new Set(["www.nonobench.com", "nonobench.com"]);

function withSiteHeaders(url: URL, response: Response) {
	const headers = new Headers(response.headers);
	const twin = MARKDOWN_TWINS[url.pathname];
	if (twin) {
		headers.set("Link", `${AGENT_LINKS}, <${twin}>; rel="alternate"; type="text/markdown"`);
		// HTML and markdown share the URL, so caches must key on Accept.
		const vary = headers.get("Vary")?.split(",").map((value) => value.trim().toLowerCase()) ?? [];
		if (!vary.includes("accept")) headers.append("Vary", "Accept");
	}
	if (PUBLIC_CORS(url.pathname)) headers.set("Access-Control-Allow-Origin", "*");
	if (!INDEXABLE_HOSTS.has(url.hostname)) headers.set("X-Robots-Tag", "noindex");
	return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

async function route(request: Request, url: URL, env: SiteEnv, renderPage: RenderPage): Promise<Response> {
	// One canonical form per URL, as before: no trailing slash.
	if (url.pathname !== "/" && url.pathname.endsWith("/")) {
		return new Response(null, { status: 308, headers: { Location: `${url.pathname.replace(/\/+$/, "") || "/"}${url.search}` } });
	}

	if (url.pathname === "/mcp") return handleMcp(request);

	const twin = MARKDOWN_TWINS[url.pathname];
	const accept = request.headers.get("Accept") ?? "";
	const pathname = twin && accept.includes("text/markdown") ? twin : url.pathname;

	const matched = matchRoute(pathname);
	if (matched) return dispatch(request, matched.route, matched.params);

	// The Open Graph image is rendered at build time (tools/og-image.tsx).
	if (pathname === "/opengraph-image") {
		const image = await env.ASSETS.fetch(new URL("/opengraph-image.png", url));
		return request.method === "HEAD" ? new Response(null, image) : image;
	}

	const asset = await env.ASSETS.fetch(request);
	if (asset.status !== 404) return asset;

	// Not a file: render the page. Pages are prerendered into the assets at
	// build time, so at runtime this renders the not-found page.
	if (request.method !== "GET" && request.method !== "HEAD") {
		return new Response("Method Not Allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
	}
	const page = await renderPage(request);
	if (page.status !== 404) return page;
	const headers = new Headers(page.headers);
	headers.set("Cache-Control", "private, no-cache, no-store, max-age=0, must-revalidate");
	return new Response(page.body, { status: 404, headers });
}

export async function handleRequest(request: Request, env: SiteEnv, renderPage: RenderPage): Promise<Response> {
	bindAssets(env.ASSETS);
	const url = new URL(request.url);

	// The bare domain redirects to www, path and query included.
	if (url.hostname === "nonobench.com") {
		url.hostname = "www.nonobench.com";
		return new Response(null, { status: 308, headers: { Location: url.toString() } });
	}

	return withSiteHeaders(url, await route(request, url, env, renderPage));
}
