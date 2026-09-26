import { AbsoluteFill, Interactive, interpolate, useCurrentFrame } from "remotion";

import { NB } from "../data";
import { cellOnset, Nonogram } from "../brand/Nonogram";
import { type Cue, pluck, Sfx } from "../brand/sfx";
import { C, clamp, FONT, SIZE_COLORS, sizeLabel, snap } from "../brand/theme";
import { Headline } from "../brand/ui";

const SOLVE = { from: 34, to: 120, order: "rows" as const, span: 0.3 };

// The grid fills a row at a time: one pluck per row, climbing, and a soft tick
// for the row's crosses.
const cues: Cue[] = Array.from({ length: NB.puzzles.intro.height }, (_, y) => {
	const at = cellOnset(NB.puzzles.intro, 0, y, SOLVE) ?? SOLVE.from;
	return [
		{ at, sound: pluck(5 + y), volume: 0.6 },
		{ at: at + 3, sound: "cross", volume: 0.18 },
	];
}).flat();

// What the benchmark asks: the 5x5 from the how-it-works prompt, solved row by
// row while the rules sit beside it.
export const ThePuzzle: React.FC = () => {
	const frame = useCurrentFrame();
	const sizes = ["5x5", "10x10", "15x15"] as const;

	return (
		<AbsoluteFill style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 150, padding: "0 160px" }}>
			<Sfx cues={cues} />
			<div
				style={{
					opacity: interpolate(frame, [0, 14], [0, 1], clamp),
					scale: interpolate(frame, [0, 24], [0.94, 1], { ...clamp, easing: snap }),
				}}
			>
				<Nonogram
					puzzle={NB.puzzles.intro}
					cell={104}
					clueSize={40}
					progress={interpolate(frame, [SOLVE.from, SOLVE.to], [0, 1], clamp)}
					order={SOLVE.order}
					span={SOLVE.span}
					cluesOpacity={interpolate(frame, [8, 22], [0, 1], clamp)}
					fill={() => SIZE_COLORS["5x5"]}
				/>
			</div>
			<div style={{ display: "flex", flexDirection: "column", gap: 40, maxWidth: 820 }}>
				<Headline
					style={{
						opacity: interpolate(frame, [6, 20], [0, 1], clamp),
						translate: interpolate(frame, [6, 26], ["0px 24px", "0px 0px"], { ...clamp, easing: snap }),
					}}
				>
					fill the grid.
					<br />
					match every clue.
				</Headline>
				<Interactive.Div
					name="Rules"
					style={{
						fontFamily: FONT.sans,
						fontSize: 42,
						lineHeight: 1.35,
						textWrap: "balance",
						color: C.mutedInk,
						opacity: interpolate(frame, [22, 38], [0, 1], clamp),
						translate: interpolate(frame, [22, 42], ["0px 20px", "0px 0px"], { ...clamp, easing: snap }),
					}}
				>
					Each number is a run of filled cells. Models get the clues as text and return the whole grid.
				</Interactive.Div>
				<div
					style={{
						display: "flex",
						flexWrap: "wrap",
						columnGap: 30,
						rowGap: 14,
						fontFamily: FONT.mono,
						fontSize: 30,
						color: C.dim,
						opacity: interpolate(frame, [60, 76], [0, 1], clamp),
					}}
				>
					<span style={{ width: "100%", color: C.mutedInk }}>{NB.counts.standardPuzzles} puzzles, one shot each</span>
					{sizes.map((size) => (
						<span key={size} style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
							<span style={{ width: 16, height: 16, borderRadius: 4, background: SIZE_COLORS[size] }} />
							{sizeLabel(size)}
						</span>
					))}
				</div>
			</div>
		</AbsoluteFill>
	);
};
