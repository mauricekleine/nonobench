// Checks the workshop deployment: the public API is open, the protected
// endpoint rejects missing and wrong keys and accepts the right one, and the
// published MCP doesn't expose the protected data. Reads the key from
// NONOBENCH_WORKSHOP_API_KEY and prints only statuses, never the key.
//
//   node workshop/verify.mjs [base-url]            # key set: expects access
//   node workshop/verify.mjs [base-url] --revoked  # after revocation: expects the key to fail
//
// base-url defaults to https://beta.nonobench.com.

const args = process.argv.slice(2);
const revoked = args.includes("--revoked");
const base = (args.find((arg) => !arg.startsWith("--")) ?? "https://beta.nonobench.com").replace(/\/+$/, "");
const key = process.env.NONOBENCH_WORKSHOP_API_KEY?.trim() ?? "";

const results = [];
const check = (name, ok, detail) => results.push({ name, ok, detail });
const skip = (name, detail) => results.push({ name, ok: true, skipped: true, detail });
const get = (path, headers = {}) => fetch(base + path, { headers, redirect: "manual" });
const report = "/api/workshop/report";

const leaderboard = await get("/api/v1/leaderboard?size=15x15&effort=best&min_correct=1");
const top = leaderboard.ok ? (await leaderboard.json()).models[0]?.model : undefined;
check("public leaderboard, no key", leaderboard.status === 200 && Boolean(top), `HTTP ${leaderboard.status}`);
const model = await get(`/api/v1/models/${top}`);
check("public model results, no key", model.status === 200, `HTTP ${model.status}`);

const spec = await (await get("/api/openapi.json")).json();
check("OpenAPI documents the protected endpoint", Boolean(spec.paths?.[report]?.get?.security), spec.paths?.[report] ? "present" : "missing");

// After revocation by deleting the secret, every request gets 503 instead of 401.
const refused = (status) => status === 401 || (revoked && status === 503);
const missing = await get(report);
check("protected, no key", refused(missing.status), `HTTP ${missing.status}`);
const wrong = await get(report, { Authorization: "Bearer not-the-workshop-key" });
check("protected, wrong key", refused(wrong.status), `HTTP ${wrong.status}`);

if (!key) {
	skip(revoked ? "protected, revoked key" : "protected, workshop key", "set NONOBENCH_WORKSHOP_API_KEY to check it");
} else {
	const withKey = await get(report, { Authorization: `Bearer ${key}` });
	const body = withKey.status === 200 ? await withKey.json() : undefined;
	if (revoked) check("protected, revoked key", withKey.status === 401 || withKey.status === 503, `HTTP ${withKey.status}`);
	else check("protected, workshop key", withKey.status === 200 && body?.sample === true, `HTTP ${withKey.status}`);
}

if (base.startsWith("https://")) {
	const plain = await fetch(`${base.replace("https://", "http://")}${report}`, { headers: { Authorization: "Bearer not-the-workshop-key" }, redirect: "manual" });
	check("plain http:// refused, not redirected", plain.status === 403, `HTTP ${plain.status}`);
}

const tools = await fetch(`${base}/mcp`, {
	method: "POST",
	headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream", "MCP-Protocol-Version": "2025-06-18" },
	body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
});
const toolText = await tools.text();
check("published MCP still lists its tools", tools.status === 200 && toolText.includes("get_leaderboard"), `HTTP ${tools.status}`);
check("published MCP doesn't expose the report", !toolText.includes("workshop"), toolText.includes("workshop") ? "exposed" : "absent");

for (const { name, ok, skipped, detail } of results) console.log(`${skipped ? "SKIP" : ok ? "PASS" : "FAIL"}  ${name} (${detail})`);
const failed = results.filter((result) => !result.ok).length;
console.log(failed ? `\n${failed} check(s) failed against ${base}` : `\nAll ${results.length} checks passed against ${base}`);
process.exitCode = failed ? 1 : 0;
