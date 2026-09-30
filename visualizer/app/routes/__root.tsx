import unboundedFont from "@fontsource-variable/unbounded/files/unbounded-latin-wght-normal.woff2?url";
import figtreeFont from "@fontsource-variable/figtree/files/figtree-latin-wght-normal.woff2?url";
import fragmentMonoFont from "@fontsource/fragment-mono/files/fragment-mono-latin-400-normal.woff2?url";
import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
import type { ReactNode } from "react";

import { ProviderLogoSprite } from "@/components/provider-logos/provider-logo";
import { WebMcp } from "@/components/webmcp";
import { RESULTS_VERSION } from "@/lib/results-version";

import appCss from "../globals.css?url";

const SITE_URL = "https://www.nonobench.com";
const TITLE = "Nonobench – LLM Nonogram Puzzle Solving Benchmark";
const DESCRIPTION =
	"Evaluate and compare how well large language models solve Nonogram (Picross) puzzles. Interactive benchmark results, visualizations, and leaderboards for AI reasoning capabilities.";
const SHARE_DESCRIPTION =
	"Evaluate and compare how well large language models solve Nonogram puzzles. Interactive benchmark results and AI reasoning leaderboards.";
const KEYWORDS = [
	"Nonobench",
	"Nonogram",
	"Picross",
	"LLM benchmark",
	"AI puzzle solving",
	"large language models",
	"reasoning benchmark",
	"GPT",
	"Claude",
	"machine learning evaluation",
];

// Rendered at build time by tools/og-image.tsx; the query changes with each
// results export so link previews refresh.
const OG_IMAGE = `${SITE_URL}/opengraph-image?${RESULTS_VERSION}`;
const OG_ALT = "Nonobench: how well LLMs solve nonogram puzzles";

const jsonLd = {
	"@context": "https://schema.org",
	"@type": "WebSite",
	name: "Nonobench",
	url: SITE_URL,
	creator: {
		"@type": "Person",
		"@id": "https://www.mauricekleine.com/#maurice",
		name: "Maurice Kleine",
		url: "https://www.mauricekleine.com/",
	},
};

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ title: TITLE },
			{ name: "description", content: DESCRIPTION },
			{ name: "author", content: "Maurice Kleine" },
			{ name: "keywords", content: KEYWORDS.join(",") },
			{ name: "creator", content: "Maurice Kleine" },
			{ name: "publisher", content: "Maurice Kleine" },
			{ name: "robots", content: "index, follow" },
			{ name: "googlebot", content: "index, follow, max-video-preview:-1, max-image-preview:large, max-snippet:-1" },
			{ name: "category", content: "Technology" },
			{ property: "og:title", content: TITLE },
			{ property: "og:description", content: SHARE_DESCRIPTION },
			{ property: "og:site_name", content: "Nonobench" },
			{ property: "og:locale", content: "en_US" },
			{ property: "og:image", content: OG_IMAGE },
			{ property: "og:image:type", content: "image/png" },
			{ property: "og:image:width", content: "1200" },
			{ property: "og:image:height", content: "630" },
			{ property: "og:image:alt", content: OG_ALT },
			{ property: "og:type", content: "website" },
			{ name: "twitter:card", content: "summary_large_image" },
			{ name: "twitter:title", content: TITLE },
			{ name: "twitter:description", content: SHARE_DESCRIPTION },
			{ name: "twitter:image", content: OG_IMAGE },
			{ name: "twitter:image:alt", content: OG_ALT },
			{ name: "twitter:image:type", content: "image/png" },
			{ name: "twitter:image:width", content: "1200" },
			{ name: "twitter:image:height", content: "630" },
		],
		links: [
			{ rel: "preload", href: unboundedFont, as: "font", type: "font/woff2", crossOrigin: "" },
			{ rel: "preload", href: figtreeFont, as: "font", type: "font/woff2", crossOrigin: "" },
			{ rel: "preload", href: fragmentMonoFont, as: "font", type: "font/woff2", crossOrigin: "" },
			{ rel: "stylesheet", href: appCss },
			{ rel: "icon", href: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
			{ rel: "icon", href: "/icon.svg", sizes: "any", type: "image/svg+xml" },
			{ rel: "apple-touch-icon", href: "/apple-icon.png", sizes: "180x180", type: "image/png" },
		],
	}),
	shellComponent: RootDocument,
	component: () => (
		<NuqsAdapter>
			<Outlet />
		</NuqsAdapter>
	),
});

function RootDocument({ children }: { children: ReactNode }) {
	return (
		<html lang="en" className="dark">
			<head>
				<HeadContent />
			</head>
			<body className="antialiased font-sans">
				<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
				<ProviderLogoSprite />
				{children}
				<WebMcp />
				{import.meta.env.PROD && <script async src="https://api.nonobench.com/latest.js" />}
				<Scripts />
			</body>
		</html>
	);
}
