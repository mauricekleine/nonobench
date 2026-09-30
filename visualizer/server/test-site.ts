import { handleRequest, type SiteEnv } from "./site";

// Runs the Worker's request handler in Bun. ASSETS serves public/ from disk
// and, like Workers static assets, answers other methods than GET and HEAD
// with 405. The page renderer stands in for TanStack Start: a 404 page, or
// 406 when the request doesn't accept HTML.

const publicDir = new URL("../public/", import.meta.url);

export const env: SiteEnv = {
	ASSETS: {
		async fetch(input) {
			const request = input instanceof Request ? input : new Request(input);
			const { pathname } = new URL(request.url);
			const file = Bun.file(new URL(`.${pathname}`, publicDir));
			if (pathname === "/" || !(await file.exists())) return new Response("Not Found", { status: 404 });
			return request.method === "GET" || request.method === "HEAD" ? new Response(file) : new Response(null, { status: 405 });
		},
	},
};

export const renderPage = async (request: Request) =>
	/(^|,)\s*(\*\/\*|text\/html)/.test(request.headers.get("Accept") || "*/*")
		? new Response("<!DOCTYPE html><title>404: This page could not be found.</title>", { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } })
		: Response.json({ error: "Only HTML requests are supported here" }, { status: 406 });

export function site(path: string | Request, init?: RequestInit) {
	const request = path instanceof Request ? path : new Request(new URL(path, "https://www.nonobench.com"), init);
	return handleRequest(request, env, renderPage);
}
