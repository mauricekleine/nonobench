import { handleRequest, type SiteEnv } from "./site";

// Runs the Worker's request handler in Bun: ASSETS serves public/ from disk
// and the page renderer stands in for TanStack Start with a 404 page.

const publicDir = new URL("../public/", import.meta.url);

export const env: SiteEnv = {
	ASSETS: {
		async fetch(input) {
			const url = new URL(input instanceof Request ? input.url : input);
			const file = Bun.file(new URL(`.${url.pathname}`, publicDir));
			return url.pathname !== "/" && (await file.exists()) ? new Response(file) : new Response("Not Found", { status: 404 });
		},
	},
};

export const renderPage = async () =>
	new Response("<!DOCTYPE html><title>404: This page could not be found.</title>", { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } });

export function site(path: string | Request, init?: RequestInit) {
	const request = path instanceof Request ? path : new Request(new URL(path, "https://www.nonobench.com"), init);
	return handleRequest(request, env, renderPage);
}
