import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

import { LOGO_CELLS } from "@/components/logo";
import { getLeaderboard, getModelNames, listPuzzles, SIZES } from "@/lib/data";

// Rendered at build time from results.json, so it follows every export.

export const alt = "Nonobench: how well LLMs solve nonogram puzzles";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const fontFile = (pkg: string, file: string) => readFile(join(process.cwd(), "node_modules/@fontsource", pkg, "files", file));

const [interRegular, interSemiBold, plexMono, plexMonoMedium] = await Promise.all([
	fontFile("inter", "inter-latin-400-normal.woff"),
	fontFile("inter", "inter-latin-600-normal.woff"),
	fontFile("ibm-plex-mono", "ibm-plex-mono-latin-400-normal.woff"),
	fontFile("ibm-plex-mono", "ibm-plex-mono-latin-500-normal.woff"),
]);

const FOREGROUND = "#FDFDFD";
const MUTED = "#FDFEFFA6";
const TRACK = "#FDFDFD0F";
const BORDER = "#FDFDFD14";

// Same ramp as the leaderboard chart (oklch 0.78/0.14 → 0.45/0.06 at hue 230),
// interpolated in sRGB because Satori has no oklch support.
const RAMP_TOP = [0x3a, 0xc7, 0xff];
const RAMP_BOTTOM = [0x2f, 0x5c, 0x70];

function rampColor(t: number) {
	const [r, g, b] = RAMP_TOP.map((top, i) => Math.round(top + t * (RAMP_BOTTOM[i] - top)));
	return `rgb(${r}, ${g}, ${b})`;
}

const ROWS = 6;

// Satori mis-sizes flex-grow tracks with percentage children, so the bar track
// gets a fixed width: 1072px content minus the name and value columns and gaps.
const TRACK_WIDTH = 524;

export default function Image() {
	// One row per model family (its best-ranked variant), like the site's default view.
	const seen = new Set<string>();
	const top = getLeaderboard()
		.filter((row) => row.complete && !seen.has(row.family) && seen.add(row.family))
		.slice(0, ROWS);

	return new ImageResponse(
		<div
			style={{
				width: "100%",
				height: "100%",
				display: "flex",
				flexDirection: "column",
				padding: "56px 64px",
				backgroundColor: "#000000",
				backgroundImage:
					"linear-gradient(135deg, rgba(112, 184, 255, 0.12), rgba(0, 0, 0, 0) 45%, rgba(0, 0, 0, 0) 60%, rgba(70, 254, 165, 0.10))",
				color: FOREGROUND,
				fontFamily: "Inter",
			}}
		>
			<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
				<div style={{ display: "flex", alignItems: "center", gap: 24 }}>
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							gap: 5,
							padding: 10,
							borderRadius: 14,
							border: `2px solid ${BORDER}`,
							backgroundColor: "#16171AEB",
						}}
					>
						{LOGO_CELLS.map((row, y) => (
							<div key={y} style={{ display: "flex", gap: 5 }}>
								{row.map((color, x) => (
									<div
										key={x}
										style={{
											width: 16,
											height: 16,
											borderRadius: 3,
											backgroundColor: color ?? TRACK,
										}}
									/>
								))}
							</div>
						))}
					</div>
					<div style={{ fontSize: 68, fontWeight: 600, letterSpacing: -2 }}>Nonobench</div>
				</div>
				<div
					style={{
						display: "flex",
						padding: "10px 22px",
						borderRadius: 999,
						border: `2px solid ${BORDER}`,
						color: MUTED,
						fontSize: 22,
					}}
				>
					v1.2 · LLM nonogram benchmark
				</div>
			</div>

			<div style={{ display: "flex", marginTop: 14, fontSize: 30, color: MUTED }}>
				How well language models solve nonogram puzzles
			</div>

			<div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 36 }}>
				{top.map((row, index) => (
					<div key={row.model} style={{ display: "flex", alignItems: "center", gap: 24 }}>
						<div
							style={{
								display: "flex",
								width: 400,
								flexShrink: 0,
								whiteSpace: "nowrap",
								fontFamily: "IBM Plex Mono",
								fontSize: 23,
								color: index === 0 ? FOREGROUND : MUTED,
							}}
						>
							{row.model}
						</div>
						<div style={{ display: "flex", width: TRACK_WIDTH, height: 30, borderRadius: 6, backgroundColor: TRACK }}>
							<div
								style={{
									display: "flex",
									width: Math.round((row.accuracy / 100) * TRACK_WIDTH),
									height: "100%",
									borderRadius: 6,
									backgroundColor: rampColor(index / (ROWS - 1)),
								}}
							/>
						</div>
						<div
							style={{
								display: "flex",
								justifyContent: "flex-end",
								width: 100,
								flexShrink: 0,
								fontFamily: "IBM Plex Mono",
								fontWeight: 500,
								fontSize: 24,
							}}
						>
							{`${row.accuracy.toFixed(1)}%`}
						</div>
					</div>
				))}
			</div>

			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					marginTop: "auto",
					paddingTop: 22,
					borderTop: `2px solid ${BORDER}`,
					fontFamily: "IBM Plex Mono",
					fontSize: 21,
					color: MUTED,
				}}
			>
				<div style={{ display: "flex" }}>www.nonobench.com</div>
				<div style={{ display: "flex" }}>
					{`${getModelNames().length} models · ${listPuzzles().length} puzzles · ${SIZES.join(" / ")}`}
				</div>
			</div>
		</div>,
		{
			...size,
			fonts: [
				{ name: "Inter", data: interRegular, weight: 400, style: "normal" },
				{ name: "Inter", data: interSemiBold, weight: 600, style: "normal" },
				{ name: "IBM Plex Mono", data: plexMono, weight: 400, style: "normal" },
				{ name: "IBM Plex Mono", data: plexMonoMedium, weight: 500, style: "normal" },
			],
		},
	);
}
