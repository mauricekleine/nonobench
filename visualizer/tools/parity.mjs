import { createHash } from "node:crypto";

// Compares every public route of two deployments: status, content type, the
// headers agents and browsers rely on, and the body (identical JSON and text,
// equivalent rendered content for pages). Prints a markdown report.
//
//   node tools/parity.mjs [baseline] [candidate]
//   (defaults: https://www.nonobench.com https://beta.nonobench.com)

const [baseline = "https://www.nonobench.com", candidate = "https://beta.nonobench.com"] =
  process.argv.slice(2);
const INDEXABLE = new Set(["www.nonobench.com", "nonobench.com"]);
const HEADERS = [
  "content-type",
  "link",
  "access-control-allow-origin",
  "access-control-allow-methods",
  "access-control-allow-headers",
  "cache-control",
  "vary",
  "allow",
  "location",
  "x-robots-tag",
  "x-markdown-tokens",
];

const puzzleId = (await (await fetch(`${baseline}/api/v1/puzzles?size=5x5`)).json()).puzzles[0].id;
const json = { "Content-Type": "application/json" };
const mcpHeaders = { ...json, Accept: "application/json, text/event-stream" };
const modern = (id, method, params = {}) =>
  JSON.stringify({
    jsonrpc: "2.0",
    id,
    method,
    params: {
      ...params,
      _meta: {
        "io.modelcontextprotocol/protocolVersion": "2026-07-28",
        "io.modelcontextprotocol/clientInfo": { name: "parity", version: "1.0.0" },
        "io.modelcontextprotocol/clientCapabilities": {},
      },
    },
  });

// [label, path, request, body kind]
const ROUTES = [
  ["page", "/", {}, "html"],
  ["page", "/puzzles", {}, "html"],
  ["page", "/puzzles/overview", {}, "html"],
  ["page", "/how-it-works", {}, "html"],
  ["page", "/privacy", {}, "html"],
  ["page (unknown)", "/does-not-exist", {}, "html"],
  ["markdown (Accept)", "/", { headers: { Accept: "text/markdown" } }, "text"],
  ["markdown (Accept)", "/puzzles", { headers: { Accept: "text/markdown" } }, "text"],
  ["markdown", "/index.md", {}, "text"],
  ["markdown", "/puzzles.md", {}, "text"],
  ["agent", "/llms.txt", {}, "text"],
  ["agent", "/robots.txt", {}, "text"],
  ["agent", "/sitemap.xml", {}, "text"],
  ["agent", "/.well-known/api-catalog", {}, "json"],
  ["agent", "/.well-known/ai-catalog.json", {}, "json"],
  ["agent", "/.well-known/agent-skills/index.json", {}, "json"],
  ["agent", "/.well-known/agent-skills/nonobench/SKILL.md", {}, "text"],
  ["agent", "/.well-known/mcp/server-card.json", {}, "json"],
  ["api", "/api/health", {}, "json"],
  ["api", "/api/openapi.json", {}, "json"],
  ["api", "/api/v1/leaderboard", {}, "json"],
  ["api", "/api/v1/leaderboard?size=10x10&effort=best&provider=openai,anthropic", {}, "json"],
  ["api (400)", "/api/v1/leaderboard?open_weights=maybe", {}, "json"],
  ["api (HEAD)", "/api/v1/leaderboard", { method: "HEAD" }, "none"],
  ["api (OPTIONS)", "/api/v1/leaderboard", { method: "OPTIONS" }, "none"],
  ["api (405)", "/api/v1/leaderboard", { method: "POST" }, "none"],
  ["api", "/api/v1/providers", {}, "json"],
  ["api", "/api/v1/families", {}, "json"],
  [
    "api",
    "/api/v1/compare",
    {
      method: "POST",
      headers: json,
      body: JSON.stringify({ models: ["Claude Opus 5.5", "gpt-6-astra-xhigh"] }),
    },
    "json",
  ],
  ["api (OPTIONS)", "/api/v1/compare", { method: "OPTIONS" }, "none"],
  ["api (405)", "/api/v1/compare", {}, "none"],
  ["api", "/api/v1/models/claude-opus-5.5-high", {}, "json"],
  ["api (404)", "/api/v1/models/not-a-model", {}, "json"],
  ["api", "/api/v1/models/claude-opus-5.5-high/puzzles", {}, "json"],
  ["api", "/api/v1/puzzles", {}, "json"],
  ["api", `/api/v1/puzzles/${puzzleId}?include_solution=true`, {}, "json"],
  [
    "api",
    `/api/v1/puzzles/${puzzleId}/check`,
    { method: "POST", headers: json, body: JSON.stringify({ grid: "0".repeat(25) }) },
    "json",
  ],
  ["api", `/api/v1/puzzles/${puzzleId}/results?include_answers=true`, {}, "json"],
  ["api", "/api/v1/runs?limit=5", {}, "json"],
  ["api (heaviest)", "/api/v1/runs?include_output=true&limit=500", {}, "json"],
  ["api (unknown)", "/api/v1/nope", {}, "none"],
  ["static", "/results-raw.json", {}, "json"],
  ["static", "/puzzle-results.json", {}, "json"],
  ["static", "/favicon.ico", {}, "bytes"],
  ["static", "/icon.svg", {}, "bytes"],
  ["static", "/apple-icon.png", {}, "bytes"],
  ["og image", "/opengraph-image", {}, "bytes"],
  ["redirect", "/puzzles/", { redirect: "manual" }, "none"],
  ["redirect", "/api/v1/providers/", { redirect: "manual" }, "none"],
  ["mcp (405)", "/mcp", {}, "none"],
  ["mcp (405)", "/mcp", { method: "DELETE" }, "none"],
  [
    "mcp (preflight)",
    "/mcp",
    { method: "OPTIONS", headers: { Origin: "https://www.nonobench.com" } },
    "none",
  ],
  [
    "mcp (bad origin)",
    "/mcp",
    {
      method: "POST",
      headers: { ...mcpHeaders, Origin: "https://evil.example" },
      body: modern(1, "server/discover"),
    },
    "none",
  ],
  [
    "mcp",
    "/mcp",
    {
      method: "POST",
      headers: {
        ...mcpHeaders,
        "MCP-Protocol-Version": "2026-07-28",
        "Mcp-Method": "server/discover",
      },
      body: modern(1, "server/discover"),
    },
    "json",
  ],
  [
    "mcp",
    "/mcp",
    {
      method: "POST",
      headers: { ...mcpHeaders, "MCP-Protocol-Version": "2026-07-28", "Mcp-Method": "tools/list" },
      body: modern(2, "tools/list"),
    },
    "json",
  ],
  [
    "mcp",
    "/mcp",
    {
      method: "POST",
      headers: {
        ...mcpHeaders,
        "MCP-Protocol-Version": "2026-07-28",
        "Mcp-Method": "tools/call",
        "Mcp-Name": "get_leaderboard",
      },
      body: modern(3, "tools/call", {
        name: "get_leaderboard",
        arguments: { size: "5x5", effort: "best" },
      }),
    },
    "json",
  ],
  [
    "mcp (2025 initialize)",
    "/mcp",
    {
      method: "POST",
      headers: mcpHeaders,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "parity", version: "1.0.0" },
        },
      }),
    },
    "sse",
  ],
  [
    "mcp (2024-11-05 initialize)",
    "/mcp",
    {
      method: "POST",
      headers: mcpHeaders,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "parity", version: "1.0.0" },
        },
      }),
    },
    "sse",
  ],
  [
    "mcp (notification)",
    "/mcp",
    {
      method: "POST",
      headers: { ...mcpHeaders, "MCP-Protocol-Version": "2025-06-18" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
    },
    "none",
  ],
  [
    "mcp (2025 tools/list)",
    "/mcp",
    {
      method: "POST",
      headers: { ...mcpHeaders, "MCP-Protocol-Version": "2025-06-18" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 4, method: "tools/list" }),
    },
    "sse",
  ],
  [
    "mcp (406)",
    "/mcp",
    {
      method: "POST",
      headers: { ...json, Accept: "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 5,
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "parity", version: "1.0.0" },
        },
      }),
    },
    "json",
  ],
  ["mcp (parse error)", "/mcp", { method: "POST", headers: mcpHeaders, body: "{not json" }, "json"],
  ["mcp (405)", "/mcp", { method: "PUT" }, "none"],
  [
    "redirect",
    "/mcp/",
    { method: "POST", headers: mcpHeaders, body: modern(6, "server/discover") },
    "none",
  ],
  // MCP clients and directories probe these; 404 means "no auth" and "no such document".
  ...[
    "/.well-known/oauth-protected-resource",
    "/.well-known/oauth-protected-resource/mcp",
    "/.well-known/oauth-authorization-server",
    "/.well-known/openid-configuration",
    "/.well-known/mcp.json",
  ].map((path) => ["discovery (404)", path, { headers: { Accept: "application/json" } }, "html"]),
  ["unknown (404)", "/register", { method: "POST", headers: json, body: "{}" }, "html"],
  ["api (unknown, JSON)", "/api/v1/nope", { headers: { Accept: "application/json" } }, "html"],
];

// Visible text and head metadata: what a reader or a crawler gets from a page.
function page(html) {
  const head = html.slice(0, html.indexOf("</head>"));
  const titles = [...head.matchAll(/<title[^>]*>([^<]*)<\/title>/g)].map((match) => match[1]);
  const meta = [...head.matchAll(/<meta\s[^>]*>/g)]
    .map((match) => match[0].replace(/\s*\/?>$/, ">").replace(/charSet/g, "charset"))
    .filter((tag) => !/next-size-adjust/.test(tag))
    .map((tag) => tag.replace(/opengraph-image\?[0-9a-f]+/, "opengraph-image?…"))
    .sort();
  const text = html
    .slice(html.indexOf("<body"))
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<template[\s\S]*?<\/template>/g, " ")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
  return { titles, meta, text };
}

const sse = (text) =>
  JSON.parse(
    text
      .split("\n")
      .find((line) => line.startsWith("data: "))
      ?.slice(6) ?? "null",
  );

// Next.js adds its router's cache keys to Vary on every response; they mean
// nothing outside Next, so they are dropped before comparing.
const NEXT_VARY = new Set([
  "rsc",
  "next-router-state-tree",
  "next-router-prefetch",
  "next-router-segment-prefetch",
]);

async function sample(origin, [, path, init]) {
  const started = performance.now();
  const response = await fetch(`${origin}${path}`, { redirect: "manual", ...init });
  const bytes = new Uint8Array(await response.arrayBuffer());
  const ms = Math.round(performance.now() - started);
  const headers = Object.fromEntries(HEADERS.map((name) => [name, response.headers.get(name)]));
  const vary = headers.vary
    ?.split(",")
    .map((token) => token.trim())
    .filter((token) => !NEXT_VARY.has(token.toLowerCase()));
  headers.vary = vary?.length ? vary.join(", ") : null;
  return { status: response.status, headers, bytes, text: new TextDecoder().decode(bytes), ms };
}

function firstDifference(a, b) {
  let index = 0;
  while (index < a.length && a[index] === b[index]) index++;
  return `at ${index}: …${JSON.stringify(a.slice(Math.max(0, index - 40), index + 60))} vs …${JSON.stringify(b.slice(Math.max(0, index - 40), index + 60))}`;
}

function compareBody(kind, a, b) {
  if (kind === "none") return { same: true, note: "" };
  if (kind === "bytes") {
    const hash = (bytes) => createHash("sha256").update(bytes).digest("hex").slice(0, 12);
    return hash(a.bytes) === hash(b.bytes)
      ? { same: true, note: "identical bytes" }
      : { same: false, note: `bytes differ (${a.bytes.length} vs ${b.bytes.length})` };
  }
  if (kind === "json" || kind === "sse") {
    try {
      const parse = kind === "sse" ? sse : JSON.parse;
      const left = JSON.stringify(parse(a.text));
      const right = JSON.stringify(parse(b.text));
      return left === right
        ? { same: true, note: "identical JSON" }
        : { same: false, note: `JSON differs ${firstDifference(left, right)}` };
    } catch (error) {
      return { same: a.text === b.text, note: `not JSON (${error.message})` };
    }
  }
  if (kind === "text")
    return a.text === b.text
      ? { same: true, note: "identical text" }
      : { same: false, note: `text differs ${firstDifference(a.text, b.text)}` };
  const left = page(a.text);
  const right = page(b.text);
  const notes = [];
  if (JSON.stringify(left.titles) !== JSON.stringify(right.titles))
    notes.push(`title ${JSON.stringify(left.titles)} vs ${JSON.stringify(right.titles)}`);
  const missing = left.meta.filter((tag) => !right.meta.includes(tag));
  const added = right.meta.filter((tag) => !left.meta.includes(tag));
  if (missing.length || added.length)
    notes.push(`meta −${JSON.stringify(missing)} +${JSON.stringify(added)}`);
  if (left.text !== right.text)
    notes.push(`visible text differs ${firstDifference(left.text, right.text)}`);
  return notes.length
    ? { same: false, note: notes.join("; ") }
    : { same: true, note: `same title, meta and visible text (${left.text.length} chars)` };
}

const rows = [];
const differences = [];
for (const route of ROUTES) {
  const [label, path, init, kind] = route;
  const [a, b] = await Promise.all([sample(baseline, route), sample(candidate, route)]);
  const body = compareBody(kind, a, b);
  // The beta must never be indexed; production must never send noindex.
  if (
    b.headers["x-robots-tag"] === "noindex" &&
    !a.headers["x-robots-tag"] &&
    !INDEXABLE.has(new URL(candidate).hostname)
  )
    b.headers["x-robots-tag"] = null;
  const headerDiffs = HEADERS.filter((name) => a.headers[name] !== b.headers[name]).map(
    (name) => `${name}: ${JSON.stringify(a.headers[name])} → ${JSON.stringify(b.headers[name])}`,
  );
  const method = init.method ?? "GET";
  const rpc =
    path.startsWith("/mcp") && init.body
      ? ` ${(() => {
          try {
            return JSON.parse(init.body).method;
          } catch {
            return "(invalid JSON)";
          }
        })()}`
      : "";
  const request = `${method} ${path}${rpc}${init.headers?.Accept === "text/markdown" ? " (Accept: text/markdown)" : ""}`;
  const contentType =
    a.headers["content-type"] === b.headers["content-type"]
      ? (a.headers["content-type"] ?? "–")
      : `${a.headers["content-type"]} → ${b.headers["content-type"]}`;
  rows.push(
    `| ${label} | \`${request}\` | ${a.status === b.status ? a.status : `${a.status} → ${b.status}`} | ${contentType} | ${headerDiffs.length ? `${headerDiffs.length} differ` : "same"} | ${body.same ? body.note || "–" : "**differs**"} | ${a.ms} / ${b.ms} ms |`,
  );
  if (a.status !== b.status || headerDiffs.length || !body.same)
    differences.push({
      request,
      status: a.status === b.status ? null : `${a.status} → ${b.status}`,
      headers: headerDiffs,
      body: body.same ? null : body.note,
    });
}

console.log(`# Parity: ${baseline} → ${candidate}\n`);
console.log(
  "Next.js router tokens are dropped from Vary before comparing. X-Robots-Tag: noindex on a non-production candidate is expected and not listed.\n",
);
console.log(
  "| Kind | Request | Status | Content type | Key headers | Body | Time (baseline / candidate) |",
);
console.log("| --- | --- | --- | --- | --- | --- | --- |");
console.log(rows.join("\n"));
console.log(`\n## Differences (${differences.length})\n`);
for (const difference of differences) {
  console.log(`- \`${difference.request}\``);
  if (difference.status) console.log(`  - status ${difference.status}`);
  for (const header of difference.headers) console.log(`  - ${header}`);
  if (difference.body) console.log(`  - body: ${difference.body.slice(0, 600)}`);
}
