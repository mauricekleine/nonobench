import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { Children, Fragment, isValidElement, type ReactNode } from "react";

import { providerLogoPaths } from "@/components/provider-logos/provider-logo";
import { getLeaderboard } from "@/lib/data";
import { effortLabel } from "@/lib/display";
import { PROVIDERS } from "@/lib/providers";
import results from "./results.json";

// Rendered at build time from results.json, so it follows every export. The
// styling mirrors the site: night ground, Unbounded wordmark, Figtree text,
// Fragment Mono numbers, provider-coloured bars and the ember v1.2 accent.

export const alt = "Nonobench: how well LLMs solve nonogram puzzles";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const fontFile = (pkg: string, file: string) => readFile(join(process.cwd(), "node_modules/@fontsource", pkg, "files", file));

const [unbounded, figtree, figtreeMedium, fragmentMono] = await Promise.all([
	fontFile("unbounded", "unbounded-latin-600-normal.woff"),
	fontFile("figtree", "figtree-latin-400-normal.woff"),
	fontFile("figtree", "figtree-latin-500-normal.woff"),
	fontFile("fragment-mono", "fragment-mono-latin-400-normal.woff"),
]);

// The dark theme's oklch tokens in sRGB (Satori has no oklch support).
const NIGHT = "#0b0e1e";
const PANEL = "#121426";
const LINE = "#2a2c3d";
const STARLIGHT = "#eeebe4";
const MUTED = "#adb0be";
const DIM = "#8f929c";
const EMBER = "#ed9658";
const TRACK = "#eeebe40f";

// The Nonobench mark: a solved 3x3 nonogram with its clues.
const MARK = [
	["#70B8FF", "#70B8FF", null],
	[null, "#46FEA5", "#46FEA5"],
	["#FFCA16", null, "#FFCA16"],
];
const runs = (line: (string | null)[]) => line.reduce<number[]>((acc, cell, i) => {
	if (cell && (i === 0 || !line[i - 1])) acc.push(1);
	else if (cell) acc[acc.length - 1]++;
	return acc;
}, []);
const ROW_CLUES = MARK.map(runs);
const COLUMN_CLUES = MARK[0].map((_, x) => runs(MARK.map((row) => row[x])));
const CELL = 22;
const GAP = 5;
const CLUE_WIDTH = 34;

const ROWS = 6;
// Satori mis-sizes flex-grow tracks, so the bar track gets a fixed width.
const TRACK_WIDTH = 500;

// Satori only accepts plain SVG elements, so unwrap the logo's fragments.
const flatten = (node: ReactNode): ReactNode[] =>
	Children.toArray(node).flatMap((child) =>
		isValidElement(child) && child.type === Fragment ? flatten((child.props as { children?: ReactNode }).children) : [child]);
function Logo({ provider }: { provider: string }) {
	const paths = providerLogoPaths[provider];
	if (!paths) return <div style={{ display: "flex", width: 24, height: 24 }} />;
	return <svg width={24} height={24} viewBox="0 0 24 24" fill={STARLIGHT} fillRule="evenodd">{flatten(paths)}</svg>;
}

type HardMode = { models: { model: string; runs: { outcome: string }[] }[] };

export default function Image() {
	const top = getLeaderboard(undefined, { effort: "best", minCorrect: 1 }).slice(0, ROWS);
	const hard = ((results as unknown as { hardMode?: HardMode }).hardMode?.models ?? [])
		.map((entry) => ({ model: entry.model, solved: entry.runs.filter((run) => run.outcome === "solved").length, total: entry.runs.length }))
		.sort((a, b) => b.solved - a.solved)[0];
	const hardLeader = hard && getLeaderboard("20x20", { effort: "all" }).find((row) => row.model === hard.model);

	return new ImageResponse(
		<div
			style={{
				width: "100%",
				height: "100%",
				display: "flex",
				flexDirection: "column",
				padding: "48px 64px 44px",
				backgroundColor: NIGHT,
				backgroundImage: `linear-gradient(${LINE}55 1px, transparent 1px), linear-gradient(90deg, ${LINE}55 1px, transparent 1px)`,
				backgroundSize: "48px 48px",
				color: STARLIGHT,
				fontFamily: "Figtree",
			}}
		>
			<div style={{ display: "flex", alignItems: "flex-end", gap: 26 }}>
				<div style={{ display: "flex", flexDirection: "column", gap: GAP, fontFamily: "Fragment Mono", fontSize: 15, color: DIM }}>
					<div style={{ display: "flex", gap: GAP, paddingLeft: CLUE_WIDTH + GAP }}>
						{COLUMN_CLUES.map((clues, x) => (
							<div key={x} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", width: CELL, height: 38 }}>
								{clues.map((clue, i) => <div key={i} style={{ display: "flex", lineHeight: 1.1 }}>{clue}</div>)}
							</div>
						))}
					</div>
					{MARK.map((row, y) => (
						<div key={y} style={{ display: "flex", alignItems: "center", gap: GAP }}>
							<div style={{ display: "flex", justifyContent: "flex-end", width: CLUE_WIDTH, whiteSpace: "nowrap" }}>{ROW_CLUES[y].join(" ")}</div>
							{row.map((color, x) => (
								<div key={x} style={{ width: CELL, height: CELL, borderRadius: 4, backgroundColor: color ?? TRACK }} />
							))}
						</div>
					))}
				</div>
				<div style={{ display: "flex", fontFamily: "Unbounded", fontSize: 84, letterSpacing: -3, lineHeight: 1 }}>nonobench</div>
				<div style={{ display: "flex", marginBottom: 12, padding: "4px 14px", borderRadius: 999, border: `2px solid ${EMBER}88`, color: EMBER, fontFamily: "Fragment Mono", fontSize: 22 }}>
					v1.2
				</div>
			</div>

			<div style={{ display: "flex", marginTop: 18, fontSize: 30, color: MUTED }}>
				How well LLMs solve nonogram puzzles
			</div>

			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: 12,
					marginTop: 28,
					padding: "22px 28px",
					borderRadius: 16,
					border: `2px solid ${LINE}`,
					backgroundColor: PANEL,
				}}
			>
				{top.map((row) => (
					<div key={row.model} style={{ display: "flex", alignItems: "center", gap: 20 }}>
						<div style={{ display: "flex", alignItems: "center", gap: 12, width: 380, flexShrink: 0 }}>
							<Logo provider={row.provider ?? ""} />
							<div style={{ display: "flex", fontSize: 26, fontWeight: 500, whiteSpace: "nowrap" }}>{row.familyDisplayName}</div>
							<div style={{ display: "flex", padding: "1px 8px", borderRadius: 5, border: `1.5px solid ${LINE}`, color: MUTED, fontFamily: "Fragment Mono", fontSize: 15 }}>
								{effortLabel(row.effort ?? "none")}
							</div>
						</div>
						<div style={{ display: "flex", width: TRACK_WIDTH, height: 24, borderRadius: 6, backgroundColor: TRACK }}>
							<div
								style={{
									display: "flex",
									width: Math.round((row.accuracy / 100) * TRACK_WIDTH),
									height: "100%",
									borderRadius: 6,
									backgroundColor: PROVIDERS[row.provider ?? ""]?.color ?? MUTED,
								}}
							/>
						</div>
						<div style={{ display: "flex", justifyContent: "flex-end", width: 104, flexShrink: 0, fontFamily: "Fragment Mono", fontSize: 24 }}>
							{`${row.accuracy.toFixed(1)}%`}
						</div>
					</div>
				))}
			</div>

			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", fontFamily: "Fragment Mono", fontSize: 21, color: DIM }}>
				<div style={{ display: "flex" }}>www.nonobench.com</div>
				{hard && hardLeader && (
					<div style={{ display: "flex", gap: 10 }}>
						<span style={{ color: EMBER }}>Hard mode</span>
						<span>{`${hardLeader.familyDisplayName} solves ${hard.solved} of ${hard.total}`}</span>
					</div>
				)}
			</div>
		</div>,
		{
			...size,
			fonts: [
				{ name: "Unbounded", data: unbounded, weight: 600, style: "normal" },
				{ name: "Figtree", data: figtree, weight: 400, style: "normal" },
				{ name: "Figtree", data: figtreeMedium, weight: 500, style: "normal" },
				{ name: "Fragment Mono", data: fragmentMono, weight: 400, style: "normal" },
			],
		},
	);
}
