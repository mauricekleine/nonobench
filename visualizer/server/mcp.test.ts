import { afterEach, expect, test } from "bun:test";
import { CLIENT_CAPABILITIES_META_KEY, CLIENT_INFO_META_KEY, Client, PROTOCOL_VERSION_META_KEY, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";

import { site } from "./test-site";

const url = new URL("http://localhost:3000/mcp");
const clients: Client[] = [];

afterEach(async () => {
	await Promise.all(clients.splice(0).map((client) => client.close()));
});

function request(body: unknown, headers: Record<string, string> = {}) {
	return new Request(url, {
		method: "POST",
		headers: { Host: url.host, "Content-Type": "application/json", Accept: "application/json, text/event-stream", ...headers },
		body: JSON.stringify(body),
	});
}

function modernRequest(id: number, method: string, params: Record<string, unknown> = {}) {
	return {
		jsonrpc: "2.0",
		id,
		method,
		params: { ...params, _meta: { [PROTOCOL_VERSION_META_KEY]: "2026-07-28", [CLIENT_INFO_META_KEY]: { name: "test", version: "1.0.0" }, [CLIENT_CAPABILITIES_META_KEY]: {} } },
	};
}

async function connect(modern: boolean, methods: string[], contentTypes: string[] = []) {
	const transport = new StreamableHTTPClientTransport(url, {
		fetch: async (input, init) => {
			const headers = new Headers(init?.headers);
			headers.set("Host", url.host);
			const req = new Request(input, { ...init, headers });
			let method: string | undefined;
			if (req.method === "POST") {
				const body = await req.clone().json();
				method = body.method;
				methods.push(body.method);
			}
			const response = await site(req);
			if (method === "initialize") contentTypes.push(response.headers.get("Content-Type") ?? "");
			return response;
		},
	});
	const client = new Client({ name: "nonobench-test", version: "1.0.0" }, modern ? { versionNegotiation: { mode: { pin: "2026-07-28" } } } : {});
	clients.push(client);
	await client.connect(transport);
	return client;
}

test("2026 client discovers without initialize, lists the stable catalog and calls each tool family", async () => {
	const methods: string[] = [];
	const client = await connect(true, methods);
	expect(client.getProtocolEra()).toBe("modern");
	expect(client.getServerCapabilities()?.tools?.listChanged).toBe(false);
	expect(methods[0]).toBe("server/discover");
	expect(methods).not.toContain("initialize");
	const listed = await client.listTools();
	expect(listed.tools.map((tool) => tool.name)).toEqual([
		"get_leaderboard", "list_providers", "list_families", "compare_models", "get_model_results", "list_puzzles", "get_puzzle", "check_solution", "get_puzzle_results", "get_model_puzzles", "list_runs",
	]);
	expect(listed.ttlMs).toBe(3_600_000);
	expect(listed.cacheScope).toBe("public");
	expect(listed.tools.every((tool) => tool.annotations?.readOnlyHint === true && tool.annotations?.openWorldHint === false)).toBe(true);
	expect(listed.tools.every((tool) => tool.outputSchema?.type === "object" && Object.keys(tool.outputSchema.properties ?? {}).length > 0)).toBe(true);
	const undescribed = listed.tools.flatMap((tool) => Object.entries(tool.inputSchema.properties ?? {}).filter(([, schema]) => !(schema as { description?: string }).description).map(([name]) => `${tool.name}.${name}`));
	expect(undescribed).toEqual([]);
	const call = async (name: string, args: Record<string, unknown>) => {
		const answer = await client.callTool({ name, arguments: args });
		expect(answer.isError).not.toBe(true);
		expect(answer.content[0]?.type).toBe("text");
		const parsed = JSON.parse((answer.content[0] as { text: string }).text);
		expect(answer.structuredContent).toEqual(parsed);
		return parsed;
	};
	const leaderboard = await call("get_leaderboard", { size: "5x5" });
	expect(leaderboard.models.length).toBeGreaterThan(0);
	const { providers } = await call("list_providers", {});
	expect(providers.length).toBeGreaterThan(0);
	const { families } = await call("list_families", {});
	expect(families.length).toBeGreaterThan(0);
	const model = leaderboard.models[0].model;
	await call("compare_models", { models: [model, model] });
	await call("get_model_results", { model });
	const { puzzles } = await call("list_puzzles", { size: "5x5" });
	const id = puzzles[0].id;
	await call("get_puzzle", { id });
	await call("check_solution", { id, grid: "0".repeat(25) });
	await call("get_puzzle_results", { id });
	await call("get_model_puzzles", { model });
	await call("list_runs", { limit: 1 });
});

test("modern header mismatch and unknown method are rejected by the SDK", async () => {
	const mismatch = await site(request(modernRequest(1, "tools/list"), { "MCP-Protocol-Version": "2026-07-28", "Mcp-Method": "tools/call" }));
	expect(mismatch.status).toBe(400);
	expect((await mismatch.json()).error.code).toBe(-32020);
	const unknown = await site(request(modernRequest(2, "unknown/method"), { "MCP-Protocol-Version": "2026-07-28", "Mcp-Method": "unknown/method" }));
	expect(unknown.status).toBe(404);
	expect((await unknown.json()).error.code).toBe(-32601);
});

test("Origin and browser preflight are restricted to allowed sites", async () => {
	const body = modernRequest(3, "server/discover");
	const modernHeaders = { "MCP-Protocol-Version": "2026-07-28", "Mcp-Method": "server/discover" };
	const denied = await site(request(body, { ...modernHeaders, Origin: "https://evil.example" }));
	expect(denied.status).toBe(403);
	expect(denied.headers.get("Vary")).toContain("Origin");
	expect(denied.headers.get("Access-Control-Allow-Origin")).toBeNull();
	expect((await site(request(body, { ...modernHeaders, Origin: "http://localhost.evil.example" }))).status).toBe(403);
	for (const origin of [undefined, "https://www.nonobench.com", "https://nonobench.com", "http://localhost:4123", "http://127.0.0.1:4123"]) {
		const response = await site(request(body, { ...modernHeaders, ...(origin ? { Origin: origin } : {}) }));
		expect(response.status).toBe(200);
		expect(response.headers.get("Access-Control-Allow-Origin")).toBe(origin ?? null);
		expect(response.headers.get("Vary")).toContain("Origin");
	}
	const preflight = await site(new Request(url, { method: "OPTIONS", headers: { Host: url.host, Origin: "https://nonobench.com" } }));
	expect(preflight.status).toBe(204);
	expect(preflight.headers.get("Access-Control-Allow-Headers")).toContain("Mcp-Method");
	expect(preflight.headers.get("Access-Control-Allow-Headers")).toContain("Mcp-Name");
	expect(preflight.headers.get("Access-Control-Allow-Origin")).toBe("https://nonobench.com");
	expect(preflight.headers.get("Vary")).toContain("Origin");
	expect((await site(new Request(url, { method: "OPTIONS", headers: { Host: url.host, Origin: "https://evil.example" } }))).status).toBe(403);
});

test("2025 initialize still connects to the same endpoint", async () => {
	const methods: string[] = [];
	const contentTypes: string[] = [];
	const client = await connect(false, methods, contentTypes);
	expect(client.getProtocolEra()).toBe("legacy");
	expect(client.getServerCapabilities()?.tools?.listChanged).toBe(false);
	expect(methods[0]).toBe("initialize");
	expect(contentTypes[0]).toStartWith("text/event-stream");
	expect((await client.listTools()).tools).toHaveLength(11);
});

test("GET and DELETE stay method not allowed", async () => {
	for (const method of ["GET", "DELETE"]) {
		const response = await site(new Request(url, { method, headers: { Origin: "https://www.nonobench.com" } }));
		expect(response.status).toBe(405);
		expect(response.headers.get("Allow")).toBe("POST");
		expect(response.headers.get("Access-Control-Allow-Origin")).toBe("https://www.nonobench.com");
		expect(response.headers.get("Vary")).toContain("Origin");
	}
});

test("server card advertises 2026 without change notifications", async () => {
	const card = await (await site("/.well-known/mcp/server-card.json")).json();
	expect(card.protocolVersion).toBe("2026-07-28");
	expect(card.capabilities.tools.listChanged).toBe(false);
});

// Output schemas are enforced by the SDK, so a single field that doesn't match breaks the tool. Call every model and puzzle once.
test("every model and puzzle result matches the declared output schemas", async () => {
	const client = await connect(true, []);
	const call = async (name: string, args: Record<string, unknown>) => {
		const answer = await client.callTool({ name, arguments: args });
		expect({ name, args, error: answer.isError ? answer.content : undefined }).toEqual({ name, args, error: undefined });
		return answer.structuredContent as Record<string, unknown>;
	};
	for (const size of [undefined, "5x5", "10x10", "15x15", "20x20"]) await call("get_leaderboard", size ? { size } : {});
	const { models } = await call("get_leaderboard", {}) as { models: { model: string }[] };
	for (const { model } of models) {
		await call("get_model_results", { model });
		await call("get_model_puzzles", { model });
	}
	const { puzzles } = await call("list_puzzles", {}) as { puzzles: { id: string; width: number; height: number }[] };
	for (const puzzle of puzzles) {
		await call("get_puzzle", { id: puzzle.id, include_solution: true });
		await call("get_puzzle_results", { id: puzzle.id, include_answers: true });
		await call("check_solution", { id: puzzle.id, grid: "0".repeat(puzzle.width * puzzle.height) });
	}
	await call("check_solution", { id: puzzles[0].id, grid: "01" });
	await call("list_runs", { limit: 500, include_output: true });
}, 60_000);
