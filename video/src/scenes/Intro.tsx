import { AbsoluteFill, Interactive, interpolate, useCurrentFrame } from "remotion";

import { cellOnset, MARK_PUZZLE, MARK_ROW_COLORS, Nonogram } from "../brand/Nonogram";
import { type Cue, pluck, Sfx } from "../brand/sfx";
import { C, clamp, FONT, snap } from "../brand/theme";
import { VersionPill, Wordmark } from "../brand/ui";

const SOLVE = { from: 14, to: 58, span: 0.4 };

// Each filled cell plucks a step higher; each cross ticks.
const cues: Cue[] = (() => {
	let step = 0;
	return Array.from(MARK_PUZZLE.solution, (value, i) => {
		const at = cellOnset(MARK_PUZZLE, i % 3, Math.floor(i / 3), SOLVE) ?? SOLVE.from;
		return value === "1" ? { at, sound: pluck(5 + 2 * step++), volume: 0.7 } : { at, sound: "cross", volume: 0.25 };
	});
})();

// The mark solves itself: clues, then the three coloured rows, then the solver
// crosses out the empty cells. The wordmark slides out from behind it.
export const Intro: React.FC = () => {
	const frame = useCurrentFrame();

	return (
		<AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
			<Sfx cues={cues} />
			<div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 56 }}>
				<div style={{ display: "flex", alignItems: "center" }}>
					<div
						style={{
							scale: interpolate(frame, [62, 92], [2.1, 1], { ...clamp, easing: snap }),
							translate: interpolate(frame, [62, 92], ["0px 40px", "0px 0px"], { ...clamp, easing: snap }),
						}}
					>
						<Nonogram
							puzzle={MARK_PUZZLE}
							cell={46}
							gap={18}
							clueSize={24}
							radius={11}
							progress={interpolate(frame, [SOLVE.from, SOLVE.to], [0, 1], clamp)}
							span={SOLVE.span}
							cluesOpacity={interpolate(frame, [4, 16], [0, 1], clamp)}
							boardOpacity={interpolate(frame, [0, 10], [0, 1], clamp)}
							fill={(_, y) => MARK_ROW_COLORS[y]}
						/>
					</div>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: 36,
							overflow: "hidden",
							maxWidth: interpolate(frame, [66, 100], [0, 1400], { ...clamp, easing: snap }),
							paddingLeft: interpolate(frame, [66, 100], [0, 40], { ...clamp, easing: snap }),
						}}
					>
						<Wordmark size={150} style={{ translate: interpolate(frame, [66, 100], ["-120px 0px", "0px 0px"], { ...clamp, easing: snap }) }} />
						<VersionPill size={34} style={{ opacity: interpolate(frame, [96, 108], [0, 1], clamp) }}>
							v1.2
						</VersionPill>
					</div>
				</div>
				<Interactive.Div
					name="Tagline"
					style={{
						fontFamily: FONT.sans,
						fontSize: 46,
						color: C.mutedInk,
						opacity: interpolate(frame, [104, 122], [0, 1], { ...clamp, easing: snap }),
						translate: interpolate(frame, [104, 122], ["0px 16px", "0px 0px"], { ...clamp, easing: snap }),
					}}
				>
					How well LLMs solve nonogram puzzles
				</Interactive.Div>
			</div>
		</AbsoluteFill>
	);
};
