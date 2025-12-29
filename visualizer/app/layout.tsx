import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
	subsets: ["latin"],
	variable: "--font-sans",
});

const ibmPlexMono = IBM_Plex_Mono({
	subsets: ["latin"],
	weight: ["400", "500", "600"],
	variable: "--font-mono",
});

export const metadata: Metadata = {
	title: "NonoBench Results",
	description: "Benchmark visualization for Nonogram puzzle solving by LLMs",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" className="dark">
			<body
				className={`${spaceGrotesk.variable} ${ibmPlexMono.variable} antialiased font-sans`}
			>
				{children}
			</body>
		</html>
	);
}
