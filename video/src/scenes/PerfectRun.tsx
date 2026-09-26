import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

import { NB } from "../data";
import { ProviderLogo } from "../brand/provider-logo";
import { C, clamp, FONT, PROVIDER_COLORS, SIZE_COLORS, type Size, sizeLabel, snap } from "../brand/theme";
import { type Cue, pluck, Sfx } from "../brand/sfx";
import { EffortPill } from "../brand/ui";
import { beat } from "../timing";

const TILE = 104;
const TILE_GAP = 14;
// The tiles solve in order and the last one lands on the downbeat of bar 2,
// where the music drops (see timing.ts).
const FIRST_SOLVE = beat(0, 2);
const LAST_SOLVE = beat(2);
const TILE_COUNT = NB.puzzles.standard.length;
const solvedAt = (i: number) => FIRST_SOLVE + (i * (LAST_SOLVE - FIRST_SOLVE)) / (TILE_COUNT - 1);

// Three climbing runs, one per grid size, each starting a step higher, then the
// chord on 30/30.
const cues: Cue[] = [
	...NB.puzzles.standard.map((tile, i) => ({
		at: solvedAt(i),
		sound: pluck(5 + (i % 10) + 2 * Math.floor(i / 10)),
		volume: 0.3 + (0.25 * i) / (TILE_COUNT - 1),
	})),
	{ at: LAST_SOLVE, sound: "hit", volume: 0.9 },
];

type Tile = (typeof NB.puzzles.standard)[number];

// A puzzle thumbnail: its own solution, filled in once the champion solves it.
const PuzzleTile: React.FC<{ puzzle: Tile; t: number }> = ({ puzzle, t }) => {
	const inner = TILE - 22;
	const pitch = inner / puzzle.width;
	const color = SIZE_COLORS[puzzle.size as Size];

	return (
		<div
			style={{
				position: "relative",
				width: TILE,
				height: TILE,
				borderRadius: 16,
				background: C.panel,
				boxShadow: `inset 0 0 0 1.5px ${C.line}`,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
			}}
		>
			<svg width={inner} height={inner} viewBox={`0 0 ${inner} ${inner}`}>
				{Array.from(puzzle.solution, (value, i) => {
					const x = i % puzzle.width;
					const y = Math.floor(i / puzzle.width);
					const filled = value === "1";
					return (
						<rect
							key={i}
							x={x * pitch + pitch * 0.08}
							y={y * pitch + pitch * 0.08}
							width={pitch * 0.84}
							height={pitch * 0.84}
							rx={pitch * 0.22}
							fill={filled ? color : C.starlight}
							fillOpacity={filled ? 0.07 + t * 0.93 : 0.06}
						/>
					);
				})}
			</svg>
		</div>
	);
};

// The headline moment: every Standard puzzle, solved in turn, counting to 30/30.
export const PerfectRun: React.FC = () => {
	const frame = useCurrentFrame();
	const { champion } = NB;
	const tiles = NB.puzzles.standard;
	const allSolved = solvedAt(tiles.length - 1) + 6;
	const count = tiles.filter((tile, i) => tile.championSolved && frame >= solvedAt(i)).length;
	const fifteen = champion.bySize.find((entry) => entry.size === "15x15");

	return (
		<AbsoluteFill style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 130 }}>
			<Sfx cues={cues} />
			<div style={{ display: "flex", flexDirection: "column", gap: 26, width: 900 }}>
				<div style={{ fontFamily: FONT.mono, fontSize: 30, color: C.dim, opacity: interpolate(frame, [0, 12], [0, 1], clamp) }}>
					Standard score · {champion.total} puzzles
				</div>
				<div
					style={{
						fontFamily: FONT.display,
						fontWeight: 600,
						fontSize: 260,
						lineHeight: 0.9,
						letterSpacing: "-0.04em",
						color: count === champion.total ? C.starlight : C.mutedInk,
						opacity: interpolate(frame, [0, 12], [0, 1], clamp),
						fontVariantNumeric: "tabular-nums",
					}}
				>
					{count}
					<span style={{ color: C.dim }}>/{champion.total}</span>
				</div>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: 22,
						marginTop: 18,
						fontFamily: FONT.sans,
						fontWeight: 600,
						fontSize: 60,
						color: C.starlight,
						opacity: interpolate(frame, [allSolved, allSolved + 14], [0, 1], clamp),
						translate: interpolate(frame, [allSolved, allSolved + 20], ["0px 20px", "0px 0px"], { ...clamp, easing: snap }),
					}}
				>
					<ProviderLogo provider={champion.provider} size={60} style={{ color: PROVIDER_COLORS[champion.provider] }} />
					{champion.name}
					<EffortPill size={30}>{champion.effort}</EffortPill>
				</div>
				<div
					style={{
						fontFamily: FONT.sans,
						fontSize: 44,
						lineHeight: 1.3,
						textWrap: "balance",
						color: C.mutedInk,
						opacity: interpolate(frame, [allSolved + 24, allSolved + 38], [0, 1], clamp),
					}}
				>
					First perfect run on Nonobench. No model had solved all ten 15×15s before.
				</div>
				<div
					style={{
						display: "flex",
						gap: 16,
						marginTop: 10,
						fontFamily: FONT.mono,
						fontSize: 28,
						color: C.dim,
						opacity: interpolate(frame, [allSolved + 70, allSolved + 82], [0, 1], clamp),
					}}
				>
					<span>${champion.totalCostUsd.toFixed(2)} for all {champion.total}</span>
					{fifteen && <span>· ~{Math.round(fifteen.avgDurationMs / 60000)} min per {sizeLabel("15x15")} puzzle</span>}
				</div>
			</div>

			<div style={{ position: "relative" }}>
				<div style={{ display: "grid", gridTemplateColumns: `repeat(5, ${TILE}px)`, gap: TILE_GAP }}>
					{tiles.map((tile, i) => (
						<div
							key={tile.id}
							style={{
								opacity: interpolate(frame, [i * 0.6, i * 0.6 + 10], [0, 1], clamp),
								scale: interpolate(frame, [solvedAt(i), solvedAt(i) + 5, solvedAt(i) + 12], [1, 1.06, 1], clamp),
							}}
						>
							<PuzzleTile
								puzzle={tile}
								t={tile.championSolved ? interpolate(frame, [solvedAt(i), solvedAt(i) + 8], [0, 1], { ...clamp, easing: snap }) : 0}
							/>
						</div>
					))}
				</div>
			</div>
		</AbsoluteFill>
	);
};
