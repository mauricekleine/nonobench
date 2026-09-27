import { AbsoluteFill, Interactive, interpolate, useCurrentFrame } from "remotion";

import { NB } from "../data";
import { cellOnset, Nonogram } from "../brand/Nonogram";
import { ProviderLogo } from "../brand/provider-logo";
import { type Cue, pluck, Sfx } from "../brand/sfx";
import { C, clamp, FONT, PROVIDER_COLORS, SIZE_COLORS, snap } from "../brand/theme";
import { EffortPill, Headline, Tag } from "../brand/ui";

const VIOLET = SIZE_COLORS["20x20"];
const SOLVE = { from: 20, to: 110, order: "sweep" as const, span: 0.2 };
const ROWS = NB.hardMode.results.slice(0, 3);
const CELL = 30;

// Each Hard mode result row appears and fills after the board is solved.
function rowTiming(row: number) {
	const start = 112 + row * 34;
	const cellAt = (i: number) => start + 8 + i * 3.4;
	return { start, cellAt, done: cellAt(ROWS[row]?.correct ?? 0) };
}
const LAST_ROW = rowTiming(ROWS.length - 1);

// The impact lands on the scene's downbeat (the riser leads into it from the
// leaderboard), a light sparkle climbs with the board's sweep, and every solved
// Hard puzzle plucks like the 15×15 rows did.
const cues: Cue[] = [
	{ at: 0, sound: "impact.mp3", volume: 0.6 },
	...Array.from({ length: 13 }, (_, i) => {
		const diagonal = i * 3;
		const puzzle = NB.puzzles.hard;
		const x = Math.min(diagonal, puzzle.width - 1);
		return { at: cellOnset(puzzle, x, diagonal - x, SOLVE) ?? SOLVE.from, sound: pluck(8 + i), volume: 0.2 };
	}),
	...ROWS.flatMap((result, row) => Array.from({ length: result.correct }, (_, i) => ({ at: rowTiming(row).cellAt(i), sound: pluck(5 + i), volume: 0.4 }))),
];

// Hard mode: a 20×20 from the new set solves itself in violet, then the few
// models that solved any of them, as rows of ten puzzles.
export const HardMode: React.FC = () => {
	const frame = useCurrentFrame();
	const unsolved = NB.hardMode.families - NB.hardMode.results.length;

	return (
		<AbsoluteFill style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 100 }}>
			<Sfx cues={cues} />
			<Nonogram
				puzzle={NB.puzzles.hard}
				cell={34}
				clueSize={19}
				progress={interpolate(frame, [SOLVE.from, SOLVE.to], [0, 1], clamp)}
				order={SOLVE.order}
				span={SOLVE.span}
				cluesOpacity={interpolate(frame, [6, 20], [0, 1], clamp)}
				boardOpacity={interpolate(frame, [0, 12], [0, 1], clamp)}
				fill={() => VIOLET}
			/>
			<div style={{ display: "flex", flexDirection: "column", gap: 28, width: 820 }}>
				<div style={{ opacity: interpolate(frame, [2, 12], [0, 1], clamp) }}>
					<Tag color={VIOLET}>hard mode · 20×20</Tag>
				</div>
				<Headline
					size={76}
					style={{
						opacity: interpolate(frame, [6, 18], [0, 1], clamp),
						translate: interpolate(frame, [6, 24], ["0px 20px", "0px 0px"], { ...clamp, easing: snap }),
					}}
				>
					10 brand new puzzles, for the smartest models.
				</Headline>
				<Interactive.Div
					name="Hard mode details"
					style={{
						fontFamily: FONT.sans,
						fontSize: 38,
						lineHeight: 1.35,
						textWrap: "balance",
						color: C.mutedInk,
						opacity: interpolate(frame, [30, 46], [0, 1], clamp),
						translate: interpolate(frame, [30, 50], ["0px 16px", "0px 0px"], { ...clamp, easing: snap }),
					}}
				>
					Random grids, one solution each. Five can't be solved one row or column at a time.
				</Interactive.Div>

				<div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 14 }}>
					{ROWS.map((result, row) => {
						const { start, cellAt } = rowTiming(row);
						return (
							<div
								key={result.name}
								style={{
									display: "flex",
									alignItems: "center",
									gap: 22,
									opacity: interpolate(frame, [start, start + 10], [0, 1], clamp),
									translate: interpolate(frame, [start, start + 16], ["0px 14px", "0px 0px"], { ...clamp, easing: snap }),
								}}
							>
								<div style={{ display: "flex", alignItems: "center", gap: 12, width: 340, flexShrink: 0, fontFamily: FONT.sans, fontSize: 30, color: C.starlight, whiteSpace: "nowrap" }}>
									<ProviderLogo provider={result.provider} size={28} style={{ color: PROVIDER_COLORS[result.provider], flexShrink: 0 }} />
									{result.name}
									<EffortPill size={20}>{result.effort}</EffortPill>
								</div>
								<div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
									{Array.from({ length: result.total }, (_, i) => {
										const t = i < result.correct ? interpolate(frame, [cellAt(i), cellAt(i) + 8], [0, 1], { ...clamp, easing: snap }) : 0;
										return (
											<div
												key={i}
												style={{ position: "relative", width: CELL, height: CELL, borderRadius: 7, background: C.emptyCell, boxShadow: `inset 0 0 0 1px ${C.emptyRing}` }}
											>
												<div style={{ position: "absolute", inset: 0, borderRadius: 7, background: VIOLET, opacity: t, scale: interpolate(t, [0, 1], [0.35, 1]) }} />
											</div>
										);
									})}
								</div>
								<div style={{ fontFamily: FONT.mono, fontSize: 32, color: row === 0 ? C.starlight : C.mutedInk }}>
									{result.correct}/{result.total}
								</div>
							</div>
						);
					})}
				</div>
				<div
					style={{
						fontFamily: FONT.mono,
						fontSize: 28,
						color: C.ember,
						opacity: interpolate(frame, [LAST_ROW.done + 14, LAST_ROW.done + 26], [0, 1], clamp),
					}}
				>
					{unsolved} of {NB.hardMode.families} models solved none.
				</div>
			</div>
		</AbsoluteFill>
	);
};
