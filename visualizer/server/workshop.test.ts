import { expect, test } from "bun:test";

import { handleRequest, type SiteEnv } from "./site";
import { env, renderPage } from "./test-site";

const KEY = "test-workshop-key-4f1c";
const beta = (overrides: Partial<SiteEnv> = {}): SiteEnv => ({ ...env, WORKSHOP_ENABLED: "true", WORKSHOP_API_KEY: KEY, ...overrides });
const call = (serverEnv: SiteEnv, headers: Record<string, string> = {}, init: RequestInit = {}, url = "https://beta.nonobench.com/api/workshop/report") =>
	handleRequest(new Request(url, { ...init, headers }), serverEnv, renderPage);

test("the workshop endpoint does not exist without the beta flag", async () => {
	for (const serverEnv of [env, { ...env, WORKSHOP_API_KEY: KEY }]) {
		const response = await call(serverEnv, { Authorization: `Bearer ${KEY}` }, {}, "https://www.nonobench.com/api/workshop/report");
		expect(response.status).toBe(404);
	}
});

test("the right key reads the sample report", async () => {
	const response = await call(beta(), { Authorization: `Bearer ${KEY}` });
	expect(response.status).toBe(200);
	const body = await response.json();
	expect(body.sample).toBe(true);
	expect(body.notice).toContain("not benchmark results");
	expect(response.headers.get("Cache-Control")).toBe("no-store");
	expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
	expect((await call(beta(), { Authorization: `bearer ${KEY}` })).status).toBe(200);
});

test("missing, malformed and wrong keys are rejected", async () => {
	const cases: Record<string, string>[] = [{}, { Authorization: "" }, { Authorization: "Bearer" }, { Authorization: "Bearer " }, { Authorization: KEY }, { Authorization: `Basic ${KEY}` }];
	for (const headers of cases) {
		const response = await call(beta(), headers);
		expect({ headers, status: response.status }).toEqual({ headers, status: 401 });
		expect(response.headers.get("WWW-Authenticate")).toStartWith('Bearer realm="nonobench-workshop"');
	}
	for (const wrong of ["wrong", `${KEY}x`, KEY.slice(0, -1), KEY.toUpperCase()]) {
		const response = await call(beta(), { Authorization: `Bearer ${wrong}` });
		expect({ wrong, status: response.status }).toEqual({ wrong, status: 401 });
		expect(response.headers.get("WWW-Authenticate")).toContain('error="invalid_token"');
	}
});

test("an absent server secret never grants access", async () => {
	for (const serverEnv of [beta({ WORKSHOP_API_KEY: undefined }), beta({ WORKSHOP_API_KEY: "" })]) {
		const cases: Record<string, string>[] = [{}, { Authorization: "Bearer " }, { Authorization: "Bearer undefined" }, { Authorization: `Bearer ${KEY}` }];
		for (const headers of cases) {
			expect((await call(serverEnv, headers)).status).toBe(503);
		}
	}
});

test("a rotated key revokes the old one", async () => {
	expect((await call(beta({ WORKSHOP_API_KEY: "rotated-key" }), { Authorization: `Bearer ${KEY}` })).status).toBe(401);
});

test("plain HTTP is refused, not redirected, and the key never appears in a response", async () => {
	const response = await call(beta(), { Authorization: `Bearer ${KEY}` }, {}, "http://beta.nonobench.com/api/workshop/report");
	expect(response.status).toBe(403);
	expect(response.headers.get("Location")).toBeNull();
	for (const headers of [{ Authorization: `Bearer ${KEY}` }, { Authorization: "Bearer wrong" }]) {
		const text = await (await call(beta(), headers)).text();
		expect(text).not.toContain(KEY);
	}
});

test("only GET and HEAD are allowed", async () => {
	const post = await call(beta(), { Authorization: `Bearer ${KEY}` }, { method: "POST" });
	expect(post.status).toBe(405);
	expect(post.headers.get("Allow")).toBe("GET, HEAD");
	const head = await call(beta(), { Authorization: `Bearer ${KEY}` }, { method: "HEAD" });
	expect(head.status).toBe(200);
	expect(await head.text()).toBe("");
});

test("the public API stays open and the published MCP doesn't expose the report", async () => {
	const leaderboard = await handleRequest(new Request("https://beta.nonobench.com/api/v1/leaderboard?size=15x15&effort=best"), beta(), renderPage);
	expect(leaderboard.status).toBe(200);
	expect(leaderboard.headers.get("Access-Control-Allow-Origin")).toBe("*");
	const tools = await handleRequest(new Request("https://beta.nonobench.com/mcp", {
		method: "POST",
		headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream", "MCP-Protocol-Version": "2025-06-18" },
		body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
	}), beta(), renderPage);
	const text = await tools.text();
	expect(text).toContain("get_leaderboard");
	expect(text).not.toContain("workshop");
});

test("the beta spec documents the protected endpoint with real model ids; production's doesn't", async () => {
	const betaSpec = await (await handleRequest(new Request("https://beta.nonobench.com/api/openapi.json"), beta(), renderPage)).json();
	expect(betaSpec.servers).toEqual([{ url: "https://beta.nonobench.com" }]);
	expect(betaSpec.paths["/api/workshop/report"].get.security).toEqual([{ workshopKey: [] }]);
	expect(betaSpec.components.securitySchemes.workshopKey.scheme).toBe("bearer");
	const model = betaSpec.paths["/api/v1/models/{model}"].get.parameters[0].example;
	const modelResponse = await handleRequest(new Request(`https://beta.nonobench.com/api/v1/models/${model}`), beta(), renderPage);
	expect(modelResponse.status).toBe(200);
	const example = betaSpec.paths["/api/v1/leaderboard"].get.responses["200"].content["application/json"].examples.best15x15.value;
	expect(example.models[0].model).toBe(model);
	const productionSpec = await (await handleRequest(new Request("https://www.nonobench.com/api/openapi.json"), env, renderPage)).json();
	expect(productionSpec.paths["/api/workshop/report"]).toBeUndefined();
	expect(productionSpec.servers).toEqual([{ url: "https://www.nonobench.com" }]);
});
