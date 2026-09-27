import { AbsoluteFill, Interactive, interpolate, useCurrentFrame } from "remotion";

import { cellOnset, MARK_PUZZLE, MARK_ROW_COLORS, Nonogram } from "../brand/Nonogram";
import { type Cue, Sfx } from "../brand/sfx";
import { C, clamp, FONT, snap } from "../brand/theme";
import { VersionPill, Wordmark } from "../brand/ui";

const FINISH = { from: 0, to: 40, p0: 0.55, span: 0.3 };

// The chord settles while the last crosses land.
const cues: Cue[] = [
	{ at: 2, sound: "resolve", volume: 0.95 },
	...Array.from(MARK_PUZZLE.solution, (value, i) => ({ value, at: cellOnset(MARK_PUZZLE, i % 3, Math.floor(i / 3), FINISH) }))
		.filter((cell) => cell.value === "0" && cell.at !== null)
		.map((cell) => ({ at: cell.at ?? 0, sound: "cross", volume: 0.25 })),
];

// Lockup, link, credit. The mark's crosses land last, the way the site's header
// mark finishes its puzzle on hover.
export const Outro: React.FC = () => {
	const frame = useCurrentFrame();

	return (
		<AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
			<Sfx cues={cues} />
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					gap: 60,
					opacity: interpolate(frame, [0, 14], [0, 1], clamp),
					scale: interpolate(frame, [0, 30], [0.96, 1], { ...clamp, easing: snap }),
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: 40 }}>
					<Nonogram
						puzzle={MARK_PUZZLE}
						cell={46}
						gap={18}
						clueSize={24}
						radius={11}
						progress={interpolate(frame, [FINISH.from, FINISH.to], [FINISH.p0, 1], clamp)}
						span={FINISH.span}
						fill={(_, y) => MARK_ROW_COLORS[y]}
					/>
					<Wordmark size={150} />
					<VersionPill size={34}>v1.2</VersionPill>
				</div>
				<Interactive.Div
					name="URL"
					style={{
						fontFamily: FONT.mono,
						fontSize: 56,
						color: C.ember,
						opacity: interpolate(frame, [18, 32], [0, 1], clamp),
						translate: interpolate(frame, [18, 36], ["0px 14px", "0px 0px"], { ...clamp, easing: snap }),
					}}
				>
					nonobench.com
				</Interactive.Div>
				<Interactive.Div
					name="Credit"
					style={{
						fontFamily: FONT.sans,
						fontSize: 34,
						color: C.dim,
						opacity: interpolate(frame, [34, 48], [0, 1], clamp),
					}}
				>
					a side quest by maurice kleine
				</Interactive.Div>
			</div>
		</AbsoluteFill>
	);
};
