import type { Metadata } from "next";
import { NuqsAdapter } from "nuqs/adapters/next/app";

import { ProviderLogoSprite } from "@/components/provider-logos/provider-logo";
import { WebMcp } from "@/components/webmcp";

import "./globals.css";
import Script from "next/script";

export const metadata: Metadata = {
	metadataBase: new URL("https://www.nonobench.com"),
	title: "Nonobench – LLM Nonogram Puzzle Solving Benchmark",
	description:
		"Evaluate and compare how well large language models solve Nonogram (Picross) puzzles. Interactive benchmark results, visualizations, and leaderboards for AI reasoning capabilities.",
	keywords: [
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
	],
	authors: [{ name: "Maurice Kleine" }],
	creator: "Maurice Kleine",
	publisher: "Maurice Kleine",
	robots: {
		index: true,
		follow: true,
		googleBot: {
			index: true,
			follow: true,
			"max-video-preview": -1,
			"max-image-preview": "large",
			"max-snippet": -1,
		},
	},
	openGraph: {
		type: "website",
		locale: "en_US",
		title: "Nonobench – LLM Nonogram Puzzle Solving Benchmark",
		description:
			"Evaluate and compare how well large language models solve Nonogram puzzles. Interactive benchmark results and AI reasoning leaderboards.",
		siteName: "Nonobench",
	},
	twitter: {
		card: "summary_large_image",
		title: "Nonobench – LLM Nonogram Puzzle Solving Benchmark",
		description:
			"Evaluate and compare how well large language models solve Nonogram puzzles. Interactive benchmark results and AI reasoning leaderboards.",
	},
	category: "Technology",
};

const jsonLd = {
	"@context": "https://schema.org",
	"@type": "WebSite",
	name: "Nonobench",
	url: "https://www.nonobench.com",
	creator: {
		"@type": "Person",
		"@id": "https://www.mauricekleine.com/#maurice",
		name: "Maurice Kleine",
		url: "https://www.mauricekleine.com/",
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" className="dark">
			<body
				className="antialiased font-sans"
			>
				<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
				<ProviderLogoSprite />
				<NuqsAdapter>{children}</NuqsAdapter>
				<WebMcp />

				{process.env.NODE_ENV === "production" && <Script async src="https://api.nonobench.com/latest.js" />}
			</body>
		</html>
	);
}
