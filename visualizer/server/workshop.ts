// The MCP workshop's protected endpoint. It exists only where the Worker's
// environment sets WORKSHOP_ENABLED (the beta), and it answers only a request
// that carries the shared workshop token as a bearer credential. The expected
// token is the Cloudflare secret WORKSHOP_API_KEY; without it nothing is
// granted. The data is fixed sample data, not benchmark results.

export type WorkshopEnv = { WORKSHOP_ENABLED?: string; WORKSHOP_API_KEY?: string };

export const WORKSHOP_PATH = "/api/workshop/report";

export const isWorkshopPath = (pathname: string) => pathname === "/api/workshop" || pathname.startsWith("/api/workshop/");

export const workshopEnabled = (env: WorkshopEnv) => env.WORKSHOP_ENABLED === "true";

export const WORKSHOP_REPORT = {
	sample: true,
	notice: "Sample data for the Nonobench MCP workshop. These are not benchmark results.",
	workshop: "Build your own MCP server",
	steps: [
		{ step: 1, title: "Call the public API", endpoints: ["GET /api/v1/leaderboard", "GET /api/v1/models/{model}"] },
		{ step: 2, title: "Build your own MCP", tools: ["get_leaderboard", "get_model_results"] },
		{ step: 3, title: "Compare with the published MCP", url: "https://beta.nonobench.com/mcp" },
		{ step: 4, title: "Add a protected tool", tools: ["get_workshop_report"] },
		{ step: 5, title: "Configure the secret", environmentVariable: "NONOBENCH_WORKSHOP_API_KEY" },
		{ step: 6, title: "Watch it be revoked", expect: "the protected tool fails; the public tools keep working" },
	],
	checkpoint: "If you can read this, your MCP sent the workshop key to the API as a bearer token.",
};

const HEADERS = { "Cache-Control": "no-store", "Content-Type": "application/json" };

const reply = (status: number, body: unknown, headers: Record<string, string> = {}) =>
	new Response(JSON.stringify(body), { status, headers: { ...HEADERS, ...headers } });

const unauthorized = (description: string, error?: "invalid_token") =>
	reply(401, { error: description }, {
		"WWW-Authenticate": `Bearer realm="nonobench-workshop"${error ? `, error="${error}"` : ""}`,
	});

// Comparing SHA-256 digests keeps the comparison constant-time and independent
// of the token's length.
async function sameSecret(candidate: string, expected: string) {
	const encoder = new TextEncoder();
	const [a, b] = await Promise.all([candidate, expected].map(async (value) => new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)))));
	let difference = 0;
	for (let index = 0; index < a.length; index++) difference |= a[index] ^ b[index];
	return difference === 0;
}

// A bearer token sent over plain HTTP has already crossed the network in the
// clear; refuse it instead of redirecting, so clients learn to use https://.
export function rejectPlainHttp() {
	return reply(403, { error: "Use https:// for the workshop API. The credential in this request was sent unencrypted; ask your instructor whether to rotate it." });
}

export async function workshopReport(request: Request, env: WorkshopEnv): Promise<Response> {
	if (request.method !== "GET" && request.method !== "HEAD") {
		return reply(405, { error: "Method Not Allowed" }, { Allow: "GET, HEAD" });
	}
	const expected = env.WORKSHOP_API_KEY ?? "";
	if (!expected) return reply(503, { error: "The workshop endpoint is not configured." });

	const match = /^Bearer\s+(\S+)\s*$/i.exec(request.headers.get("Authorization") ?? "");
	if (!match) return unauthorized("Send the workshop key as Authorization: Bearer <key>.");
	if (!(await sameSecret(match[1], expected))) return unauthorized("The workshop key is invalid or has been revoked.", "invalid_token");

	return request.method === "HEAD" ? new Response(null, { headers: HEADERS }) : reply(200, WORKSHOP_REPORT);
}
