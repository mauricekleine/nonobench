import { expect, test } from "bun:test";

import { handleRequest } from "./site";
import { env, renderPage, site } from "./test-site";

const html = (body: string) =>
  new Response(body, { headers: { "Content-Type": "text/html; charset=utf-8" } });

// Serves one fake prerendered page for / and /puzzles, like the built assets.
const pages = {
  ASSETS: {
    async fetch(input: Request | URL | string) {
      const { pathname } = new URL(input instanceof Request ? input.url : input);
      return pathname === "/" || pathname === "/puzzles"
        ? html(`<h1>${pathname}</h1>`)
        : env.ASSETS.fetch(input);
    },
  },
};
const page = (path: string, headers: Record<string, string> = {}) =>
  handleRequest(
    new Request(new URL(path, "https://www.nonobench.com"), { headers }),
    pages,
    renderPage,
  );

test("pages link agents to the machine-readable entry points and their markdown twin", async () => {
  for (const [path, twin] of [
    ["/", "/index.md"],
    ["/puzzles", "/puzzles.md"],
  ]) {
    const response = await page(path);
    expect(response.headers.get("Content-Type")).toStartWith("text/html");
    const link = response.headers.get("Link") ?? "";
    expect(link).toStartWith(
      '</.well-known/api-catalog>; rel="api-catalog", </api/openapi.json>; rel="service-desc"',
    );
    expect(link).toEndWith(`<${twin}>; rel="alternate"; type="text/markdown"`);
    expect(response.headers.get("Vary")).toContain("Accept");
  }
  expect((await page("/how-it-works")).headers.get("Link")).toBeNull();
});

test("Accept: text/markdown gets the markdown twin at the same URL", async () => {
  const home = await page("/", { Accept: "text/markdown, text/html;q=0.9" });
  expect(home.headers.get("Content-Type")).toBe("text/markdown; charset=utf-8");
  expect(home.headers.get("Link")).toContain('</index.md>; rel="alternate"');
  expect(Number(home.headers.get("x-markdown-tokens"))).toBeGreaterThan(0);
  expect(await home.text()).toStartWith("# Nonobench leaderboard");
  const puzzles = await page("/puzzles", { Accept: "text/markdown" });
  expect(await puzzles.text()).toStartWith("# Nonobench puzzles");
  expect((await site("/index.md")).headers.get("Content-Type")).toBe(
    "text/markdown; charset=utf-8",
  );
});

test("public data and discovery routes allow any origin", async () => {
  for (const path of [
    "/api/health",
    "/api/openapi.json",
    "/llms.txt",
    "/.well-known/api-catalog",
    "/results-raw.json",
    "/api/v1/nope",
  ]) {
    expect({ path, cors: (await site(path)).headers.get("Access-Control-Allow-Origin") }).toEqual({
      path,
      cors: "*",
    });
  }
  expect(
    (await site("/puzzle-results.json")).headers.get("Access-Control-Allow-Origin"),
  ).toBeNull();
  expect((await site("/robots.txt")).headers.get("Access-Control-Allow-Origin")).toBeNull();
});

test("only the production hosts may be indexed", async () => {
  expect((await site("/llms.txt")).headers.get("X-Robots-Tag")).toBeNull();
  expect(
    (await site(new Request("https://beta.nonobench.com/llms.txt"))).headers.get("X-Robots-Tag"),
  ).toBe("noindex");
  expect(
    (await site(new Request("https://beta.nonobench.com/does-not-exist"))).headers.get(
      "X-Robots-Tag",
    ),
  ).toBe("noindex");
});

test("the bare domain redirects to www with path and query", async () => {
  const response = await site(new Request("https://nonobench.com/puzzles?puzzle=3"));
  expect(response.status).toBe(308);
  expect(response.headers.get("Location")).toBe("https://www.nonobench.com/puzzles?puzzle=3");
});

test("plain HTTP redirects to HTTPS on the site's hosts only", async () => {
  for (const host of ["www.nonobench.com", "nonobench.com", "beta.nonobench.com"]) {
    const response = await site(new Request(`http://${host}/puzzles?puzzle=3`));
    expect(response.status).toBe(301);
    expect(response.headers.get("Location")).toBe(`https://${host}/puzzles?puzzle=3`);
  }
  const post = await site(
    new Request("http://www.nonobench.com/mcp", { method: "POST", body: "{}" }),
  );
  expect(post.status).toBe(308);
  expect(post.headers.get("Location")).toBe("https://www.nonobench.com/mcp");
  expect((await site(new Request("http://localhost:3000/llms.txt"))).status).toBe(200);
});

test("trailing slashes redirect to the canonical path", async () => {
  for (const [path, location] of [
    ["/puzzles/", "/puzzles"],
    ["/api/v1/providers/", "/api/v1/providers"],
    ["/results-raw.json/?x=1", "/results-raw.json?x=1"],
  ]) {
    const response = await site(path);
    expect(response.status).toBe(308);
    expect(response.headers.get("Location")).toBe(`https://www.nonobench.com${location}`);
  }
});

test("the trailing-slash redirect never leaves the site", async () => {
  for (const url of [
    "https://www.nonobench.com//",
    "https://www.nonobench.com//example.com/",
    "https://www.nonobench.com/\\example.com/",
    "https://www.nonobench.com///example.com//?x=1",
  ]) {
    const location = (await site(new Request(url))).headers.get("Location") ?? "";
    expect({ url, origin: new URL(location, url).origin }).toEqual({
      url,
      origin: "https://www.nonobench.com",
    });
  }
});

test("routes answer HEAD, OPTIONS and wrong methods like before", async () => {
  const head = await site("/api/v1/leaderboard", { method: "HEAD" });
  expect(head.status).toBe(200);
  expect(head.headers.get("Content-Type")).toStartWith("application/json");
  expect(await head.text()).toBe("");
  const options = await site("/api/v1/leaderboard", { method: "OPTIONS" });
  expect(options.status).toBe(204);
  expect(options.headers.get("Allow")).toBe("GET, HEAD, OPTIONS");
  expect((await site("/api/v1/compare", { method: "OPTIONS" })).headers.get("Allow")).toBe(
    "OPTIONS, POST",
  );
  const wrong = await site("/api/v1/leaderboard", { method: "POST" });
  expect(wrong.status).toBe(405);
  expect(await wrong.text()).toBe("");
  expect((await site("/api/v1/compare")).status).toBe(405);
});

test("unknown paths render the not-found page, never cached", async () => {
  const response = await site("/does-not-exist");
  expect(response.status).toBe(404);
  expect(response.headers.get("Content-Type")).toStartWith("text/html");
  expect(response.headers.get("Cache-Control")).toBe(
    "private, no-cache, no-store, max-age=0, must-revalidate",
  );
});

// MCP clients probe OAuth metadata with Accept: application/json and treat 404 as "no auth".
test("unknown paths are 404 whatever the method or Accept header", async () => {
  for (const path of [
    "/.well-known/oauth-protected-resource",
    "/.well-known/oauth-authorization-server",
    "/api/v1/nope",
  ]) {
    const response = await site(path, { headers: { Accept: "application/json" } });
    expect({ path, status: response.status }).toEqual({ path, status: 404 });
  }
  for (const method of ["POST", "PUT", "DELETE"])
    expect((await site("/register", { method })).status).toBe(404);
});

test("files and pages answer other methods than GET and HEAD with 405", async () => {
  const response = await site("/results-raw.json", { method: "POST" });
  expect(response.status).toBe(405);
  expect(response.headers.get("Allow")).toBe("GET, HEAD");
});

test("the Open Graph image is served from its build-time asset", async () => {
  const requested: string[] = [];
  const assets = {
    ASSETS: {
      fetch: async (input: Request | URL | string) => {
        requested.push(new URL(input instanceof Request ? input.url : input).pathname);
        return new Response("png", { headers: { "Content-Type": "image/png" } });
      },
    },
  };
  const response = await handleRequest(
    new Request("https://www.nonobench.com/opengraph-image?0123456789abcdef"),
    assets,
    renderPage,
  );
  expect(response.headers.get("Content-Type")).toBe("image/png");
  expect(requested).toEqual(["/opengraph-image.png"]);
});

test("agent documents keep their content types", async () => {
  expect((await site("/robots.txt")).headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
  expect((await site("/llms.txt")).headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
  expect((await site("/.well-known/api-catalog")).headers.get("Content-Type")).toBe(
    'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"',
  );
  expect(
    (await site("/.well-known/agent-skills/nonobench/SKILL.md")).headers.get("Content-Type"),
  ).toBe("text/markdown; charset=utf-8");
  const sitemap = await site("/sitemap.xml");
  expect(sitemap.headers.get("Content-Type")).toBe("application/xml");
  const xml = await sitemap.text();
  expect(xml).toStartWith(
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n<url>\n<loc>https://www.nonobench.com/</loc>',
  );
  expect(xml.match(/<url>/g)).toHaveLength(5);
});
