import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

import { NB } from "../data";
import { C, clamp, FONT, PROVIDER_COLORS, SIZE_COLORS, snap } from "../brand/theme";
import { type Cue, pluck, Sfx } from "../brand/sfx";
import { Headline } from "../brand/ui";

// The effort levels, lowest to highest, as a row of cells lit left to right.
const LadderGlyph: React.FC<{ t: number }> = ({ t }) => (
	<div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
		{Array.from({ length: 7 }, (_, i) => (
			<div
				key={i}
				style={{
					width: 16,
					height: 12 + i * 6,
					borderRadius: 4,
					background: i / 6 <= t ? C.ember : C.emptyCell,
				}}
			/>
		))}
	</div>
);

// A single model routed to its own lab: one cell, one line, one cell.
const PinGlyph: React.FC<{ t: number }> = ({ t }) => (
	<div style={{ display: "flex", alignItems: "center", gap: 0 }}>
		<div style={{ width: 22, height: 22, borderRadius: 6, background: C.starlight }} />
		<div style={{ width: 56 * t, height: 3, background: C.ember }} />
		<div style={{ width: 22, height: 22, borderRadius: 6, background: t >= 1 ? C.ember : C.emptyCell, marginLeft: 56 * (1 - t) }} />
	</div>
);

const GridGlyph: React.FC<{ t: number; color: string; n: number }> = ({ t, color, n }) => (
	<div style={{ display: "grid", gridTemplateColumns: `repeat(${n}, 10px)`, gap: 3 }}>
		{Array.from({ length: n * n }, (_, i) => (
			<div key={i} style={{ width: 10, height: 10, borderRadius: 2.5, background: (i % n) + Math.floor(i / n) <= t * (2 * n - 2) ? color : C.emptyCell }} />
		))}
	</div>
);

// One cell per provider, in its leaderboard colour.
const ModelsGlyph: React.FC<{ t: number }> = ({ t }) => {
	const colors = Object.values(PROVIDER_COLORS);
	return (
		<div style={{ display: "flex", gap: 6 }}>
			{colors.map((color, i) => (
				<div key={color} style={{ width: 20, height: 20, borderRadius: 5, background: i / colors.length < t ? color : C.emptyCell }} />
			))}
		</div>
	);
};

// Every level the champion's family ran, and the catch when max isn't its best.
function ladderLine() {
	const steps = NB.championLadder;
	const best = steps.reduce((top, step) => (step.correct > top.correct ? step : top), steps[0]);
	const max = steps.find((step) => step.effort === "max");
	if (!best || !max || max.correct >= best.correct) return "Every effort level a model offers, each one measured.";
	return `Every effort level a model offers, each one measured. More isn't always better: ${NB.champion.name.replaceAll(" ", "\u00a0")} scores ${best.correct}/${best.total} at ${best.effort}, ${max.correct}/${max.total} at max.`;
}

const ITEMS = [
	{
		title: "hard mode",
		body: "Standard no longer separates the top models. Ten random 20×20 puzzles do, scored on their own.",
		glyph: (t: number) => <GridGlyph t={t} color={SIZE_COLORS["20x20"]} n={6} />,
	},
	{
		title: "first-party providers",
		body: "Every model runs on its own lab's endpoint through OpenRouter, with no fallback hosts.",
		glyph: (t: number) => <PinGlyph t={t} />,
	},
	{
		title: "full effort ladders",
		body: ladderLine(),
		glyph: (t: number) => <LadderGlyph t={t} />,
	},
	{
		title: `${NB.counts.models} models, ${NB.counts.variants} variants`,
		body: "Including September's new releases.",
		glyph: (t: number) => <ModelsGlyph t={t} />,
	},
];

const cardStart = (i: number) => 14 + i * 54;

// One pluck per card as it lands.
const cues: Cue[] = [7, 9, 10, 12].map((degree, i) => ({ at: cardStart(i), sound: pluck(degree), volume: 0.45 }));

export const WhatsNew: React.FC = () => {
	const frame = useCurrentFrame();

	return (
		<AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
			<Sfx cues={cues} />
			<div style={{ display: "flex", flexDirection: "column", gap: 56, width: 1600 }}>
				<Headline
					style={{
						opacity: interpolate(frame, [0, 12], [0, 1], clamp),
						translate: interpolate(frame, [0, 20], ["0px 24px", "0px 0px"], { ...clamp, easing: snap }),
					}}
				>
					new in v1.2
				</Headline>
				<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
					{ITEMS.map((item, i) => {
						const start = cardStart(i);
						// Linear on purpose: the glyphs step in even increments, and an ease-out
						// would stall the last step.
						const t = interpolate(frame, [start + 8, start + 44], [0, 1], clamp);
						return (
							<div
								key={item.title}
								style={{
									display: "flex",
									flexDirection: "column",
									gap: 18,
									minHeight: 300,
									padding: "36px 40px",
									borderRadius: 24,
									background: "color-mix(in oklch, oklch(20% 0.035 278) 88%, transparent)",
									boxShadow: `inset 0 0 0 1.5px ${C.line}`,
									opacity: interpolate(frame, [start, start + 12], [0, 1], clamp),
									translate: interpolate(frame, [start, start + 22], ["0px 26px", "0px 0px"], { ...clamp, easing: snap }),
								}}
							>
								<div style={{ height: 76, display: "flex", alignItems: "flex-end" }}>{item.glyph(t)}</div>
								<div style={{ fontFamily: FONT.display, fontWeight: 500, fontSize: 42, color: C.starlight, letterSpacing: "-0.01em" }}>{item.title}</div>
								<div style={{ fontFamily: FONT.sans, fontSize: 34, lineHeight: 1.3, color: C.mutedInk }}>{item.body}</div>
							</div>
						);
					})}
				</div>
			</div>
		</AbsoluteFill>
	);
};
