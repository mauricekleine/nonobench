import { createMcpHandler } from "@modelcontextprotocol/server";

import { SITE_URL } from "@/lib/data";
import { createMcpServer } from "@/lib/mcp";

const site = new URL(SITE_URL);
const allowedSiteOrigins = new Set([site.origin, `${site.protocol}//${site.hostname.replace(/^www\./, "")}`]);
const handler = createMcpHandler(createMcpServer);

function allowedOrigin(origin: string) {
	if (allowedSiteOrigins.has(origin)) return true;
	try {
		const url = new URL(origin);
		return url.origin === origin && url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1");
	} catch {
		return false;
	}
}

function validateOrigin(request: Request) {
	const origin = request.headers.get("Origin");
	if (origin && !allowedOrigin(origin)) return new Response(null, { status: 403 });
}

function withCors(response: Response, request: Request) {
	const origin = request.headers.get("Origin");
	if (origin && allowedOrigin(origin)) {
		response.headers.set("Access-Control-Allow-Origin", origin);
	}
	response.headers.append("Vary", "Origin");
	return response;
}

export async function POST(request: Request) {
	const rejected = validateOrigin(request);
	if (rejected) return withCors(rejected, request);
	return withCors(await handler.fetch(request), request);
}

function methodNotAllowed(request: Request) {
	const rejected = validateOrigin(request);
	if (rejected) return withCors(rejected, request);
	return withCors(new Response(null, { status: 405, headers: { Allow: "POST" } }), request);
}

export { methodNotAllowed as GET, methodNotAllowed as DELETE };

export function OPTIONS(request: Request) {
	const rejected = validateOrigin(request);
	if (rejected) return withCors(rejected, request);
	return withCors(new Response(null, {
		status: 204,
		headers: {
			"Access-Control-Allow-Methods": "POST, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type, MCP-Protocol-Version, Mcp-Method, Mcp-Name, Mcp-Session-Id, Last-Event-ID",
			"Access-Control-Max-Age": "3600",
		},
	}), request);
}
