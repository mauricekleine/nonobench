import type { Metadata } from "next";
import { Inter, IBM_Plex_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next"
import { NuqsAdapter } from "nuqs/adapters/next/app";

import "./globals.css";

// Resend uses Inter for body text
const inter = Inter({
	subsets: ["latin"],
	variable: "--font-sans",
});

// Resend uses CommitMono for code - IBM Plex Mono as fallback since CommitMono isn't on Google Fonts
const ibmPlexMono = IBM_Plex_Mono({
	subsets: ["latin"],
	weight: ["400", "500", "600"],
	variable: "--font-mono",
});

export const metadata: Metadata = {
	title: "NonoBench – LLM Nonogram Puzzle Solving Benchmark",
	description:
		"Evaluate and compare how well large language models solve Nonogram (Picross) puzzles. Interactive benchmark results, visualizations, and leaderboards for AI reasoning capabilities.",
	keywords: [
		"NonoBench",
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
		title: "NonoBench – LLM Nonogram Puzzle Solving Benchmark",
		description:
			"Evaluate and compare how well large language models solve Nonogram puzzles. Interactive benchmark results and AI reasoning leaderboards.",
		siteName: "NonoBench",
	},
	twitter: {
		card: "summary_large_image",
		title: "NonoBench – LLM Nonogram Puzzle Solving Benchmark",
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
				className={`${inter.variable} ${ibmPlexMono.variable} antialiased font-sans`}
			>
				<NuqsAdapter>{children}</NuqsAdapter>

				<Analytics />
			</body>
		</html>
	);
}
