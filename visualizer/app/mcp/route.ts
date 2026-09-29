import { createMcpHandler, hostHeaderValidationResponse, originValidationResponse } from "@modelcontextprotocol/server";

import { SITE_URL } from "@/lib/data";
import { createMcpServer } from "@/lib/mcp";

const site = new URL(SITE_URL);
const allowedSiteOrigins = new Set([site.origin, `${site.protocol}//${site.hostname.replace(/^www\./, "")}`]);
const allowedHostnames = [site.hostname, site.hostname.replace(/^www\./, ""), "localhost", "127.0.0.1"];
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

function validateRequest(request: Request) {
	const rejected = hostHeaderValidationResponse(request, allowedHostnames) ?? originValidationResponse(request, allowedHostnames);
	if (rejected) return rejected;
	const origin = request.headers.get("Origin");
	if (origin && !allowedOrigin(origin)) return new Response(null, { status: 403 });
}

function withCors(response: Response, request: Request) {
	const origin = request.headers.get("Origin");
	if (origin) {
		response.headers.set("Access-Control-Allow-Origin", origin);
		response.headers.set("Vary", "Origin");
	}
	return response;
}

async function serve(request: Request) {
	const rejected = validateRequest(request);
	if (rejected) return rejected;
	return withCors(await handler.fetch(request), request);
}

export { serve as POST, serve as GET, serve as DELETE };

export function OPTIONS(request: Request) {
	const rejected = validateRequest(request);
	if (rejected) return rejected;
	return withCors(new Response(null, {
		status: 204,
		headers: {
			"Access-Control-Allow-Methods": "POST, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type, MCP-Protocol-Version, Mcp-Method, Mcp-Name, Mcp-Session-Id, Last-Event-ID",
			"Access-Control-Max-Age": "3600",
		},
	}), request);
}
