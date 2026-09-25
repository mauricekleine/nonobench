import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

import { createMcpServer } from "@/lib/mcp";

// Stateless Streamable HTTP: every POST gets a fresh server, so no sessions
// need to survive between requests or across instances.
export async function POST(request: Request) {
	const server = createMcpServer();
	const transport = new WebStandardStreamableHTTPServerTransport({
		sessionIdGenerator: undefined,
		enableJsonResponse: true,
	});
	await server.connect(transport);
	return transport.handleRequest(request);
}

function methodNotAllowed() {
	return Response.json(
		{ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed. POST JSON-RPC messages to /mcp." }, id: null },
		{ status: 405, headers: { Allow: "POST" } },
	);
}

export { methodNotAllowed as GET, methodNotAllowed as DELETE };

// CORS preflight, so browser-based MCP clients can connect.
export function OPTIONS() {
	return new Response(null, {
		status: 204,
		headers: {
			"Access-Control-Allow-Methods": "POST, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type, Accept, Mcp-Protocol-Version, Mcp-Session-Id",
			"Access-Control-Max-Age": "86400",
		},
	});
}
