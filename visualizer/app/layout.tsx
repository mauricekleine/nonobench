import type { Metadata } from "next";
import { Figtree, Fragment_Mono, Unbounded } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";

import { WebMcp } from "@/components/webmcp";

import "./globals.css";
import Script from "next/script";

// Superthread type roles, from Google Fonts: a wide, squared display face for the
// wordmark and headings, a warm round sans for body, Fragment Mono for numbers and meta.
const display = Unbounded({
	subsets: ["latin"],
	weight: ["500", "600"],
	variable: "--font-display",
});

const sans = Figtree({
	subsets: ["latin"],
	variable: "--font-sans",
});

const mono = Fragment_Mono({
	subsets: ["latin"],
	weight: "400",
	variable: "--font-mono",
});

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

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" className="dark">
			<body
				className={`${display.variable} ${sans.variable} ${mono.variable} antialiased font-sans`}
			>
				<NuqsAdapter>{children}</NuqsAdapter>
				<WebMcp />

				{process.env.NODE_ENV === "production" && <Script async src="https://api.nonobench.com/latest.js" />}
			</body>
		</html>
	);
}
