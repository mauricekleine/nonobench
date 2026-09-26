import { interpolate } from "remotion";

import { C, clamp, FONT, snap } from "./theme";

export type Puzzle = {
	width: number;
	height: number;
	rowClues: number[][];
	columnClues: number[][];
	solution: string;
};

// The Nonobench mark: a solved 3x3 nonogram in the grid-size colours
// (components/logo.tsx).
export const MARK_PUZZLE: Puzzle = {
	width: 3,
	height: 3,
	rowClues: [[2], [2], [1, 1]],
	columnClues: [[1, 1], [2], [2]],
	solution: "110011101",
};
export const MARK_ROW_COLORS = ["#70B8FF", "#46FEA5", "#FFCA16"];

type Order = "reading" | "sweep" | "rows";

type Props = {
	puzzle: Puzzle;
	/** Cell edge in px. */
	cell: number;
	gap?: number;
	/** Solve progress, 0 (blank) to 1 (every cell decided). */
	progress: number;
	/** Fill colour per filled cell. */
	fill: (x: number, y: number) => string;
	order?: Order;
	/** Share of the progress range each cell spends animating in. */
	span?: number;
	/** Crosses on the empty cells as they are decided, like a solver finishing. */
	crosses?: boolean;
	cluesOpacity?: number;
	/** Opacity of the empty board (cell wells), for the whole board or per cell. */
	boardOpacity?: number | ((x: number, y: number) => number);
	/** Override the well colour per cell (e.g. to tint a region). */
	well?: (x: number, y: number) => string | undefined;
	/** Another picture laid over the wells, independent of the solve (e.g. a previous puzzle fading out). */
	ghost?: { color: (x: number, y: number) => string | undefined; opacity: number };
	clueSize?: number;
	radius?: number;
};

export function cellStart(order: Order, x: number, y: number, width: number, height: number) {
	if (order === "sweep") return (x + y) / (width + height - 2 || 1);
	if (order === "rows") return y / (height - 1 || 1);
	return (y * width + x) / (width * height - 1 || 1);
}

/**
 * Frame a cell starts animating, for a solve driven by
 * interpolate(frame, [from, to], [p0, p1]). Null when it started before `from`.
 */
export function cellOnset(
	puzzle: Pick<Puzzle, "width" | "height">,
	x: number,
	y: number,
	{ from, to, p0 = 0, p1 = 1, order = "reading", span = 0.12 }: { from: number; to: number; p0?: number; p1?: number; order?: Order; span?: number },
) {
	const p = cellStart(order, x, y, puzzle.width, puzzle.height) * (1 - span);
	if (p < p0) return null;
	return from + ((p - p0) / (p1 - p0)) * (to - from);
}

// A nonogram drawn the way the site draws it: rounded cells on faint wells,
// mono clues in dim ink, a wider gutter every fifth line like printed grids.
// Clues brighten once their line is fully decided.
export const Nonogram: React.FC<Props> = ({
	puzzle,
	cell,
	gap = Math.max(2, Math.round(cell * 0.14)),
	progress,
	fill,
	order = "reading",
	span = 0.12,
	crosses = true,
	cluesOpacity = 1,
	boardOpacity = 1,
	well,
	ghost,
	clueSize = Math.max(14, Math.round(cell * 0.5)),
	radius = Math.max(2, Math.round(cell * 0.2)),
}) => {
	const { width, height, rowClues, columnClues, solution } = puzzle;
	const groupGap = width > 5 ? Math.round(gap * 1.6) : 0;
	const pitch = cell + gap;
	const pos = (i: number) => i * pitch + Math.floor(i / 5) * groupGap;
	const gridW = pos(width - 1) + cell;
	const gridH = pos(height - 1) + cell;

	const clueLine = clueSize * 1.25;
	const clueChar = clueSize * 0.62;
	const clueGap = clueSize * 0.9;
	const colClueH = Math.max(...columnClues.map((clue) => clue.length)) * clueLine;
	const rowClueW = Math.max(...rowClues.map((clue) => clue.join(" ").length)) * clueChar;

	const local = (x: number, y: number) =>
		interpolate(progress, [cellStart(order, x, y, width, height) * (1 - span), cellStart(order, x, y, width, height) * (1 - span) + span], [0, 1], {
			...clamp,
			easing: snap,
		});

	const rowDone = (y: number) => local(width - 1, y) >= 1 && local(0, y) >= 1;
	const columnDone = (x: number) => local(x, height - 1) >= 1 && local(x, 0) >= 1;

	return (
		<div style={{ position: "relative", width: rowClueW + clueGap + gridW, height: colClueH + clueGap + gridH }}>
			{columnClues.map((clue, x) => (
				<div
					key={`c${x}`}
					style={{
						position: "absolute",
						left: rowClueW + clueGap + pos(x),
						width: cell,
						top: 0,
						height: colClueH,
						display: "flex",
						flexDirection: "column",
						justifyContent: "flex-end",
						alignItems: "center",
						fontFamily: FONT.mono,
						fontSize: clueSize,
						lineHeight: `${clueLine}px`,
						color: columnDone(x) ? C.starlight : C.dim,
						opacity: cluesOpacity,
					}}
				>
					{clue.map((n, i) => (
						<span key={i}>{n}</span>
					))}
				</div>
			))}
			{rowClues.map((clue, y) => (
				<div
					key={`r${y}`}
					style={{
						position: "absolute",
						left: 0,
						width: rowClueW,
						top: colClueH + clueGap + pos(y),
						height: cell,
						display: "flex",
						justifyContent: "flex-end",
						alignItems: "center",
						gap: clueChar * 0.6,
						fontFamily: FONT.mono,
						fontSize: clueSize,
						color: rowDone(y) ? C.starlight : C.dim,
						opacity: cluesOpacity,
					}}
				>
					{clue.map((n, i) => (
						<span key={i}>{n}</span>
					))}
				</div>
			))}
			{Array.from({ length: height }, (_, y) =>
				Array.from({ length: width }, (_, x) => {
					const filled = solution[y * width + x] === "1";
					const t = local(x, y);
					return (
						<div
							key={`${x}-${y}`}
							style={{
								position: "absolute",
								left: rowClueW + clueGap + pos(x),
								top: colClueH + clueGap + pos(y),
								width: cell,
								height: cell,
								borderRadius: radius,
								background: well?.(x, y) ?? C.emptyCell,
								boxShadow: `inset 0 0 0 1px ${C.emptyRing}`,
								opacity: typeof boardOpacity === "function" ? boardOpacity(x, y) : boardOpacity,
							}}
						>
							{ghost && ghost.opacity > 0 && ghost.color(x, y) && (
								<div style={{ position: "absolute", inset: 0, borderRadius: radius, background: ghost.color(x, y), opacity: ghost.opacity }} />
							)}
							{filled ? (
								<div
									style={{
										position: "absolute",
										inset: 0,
										borderRadius: radius,
										background: fill(x, y),
										opacity: t,
										scale: interpolate(t, [0, 1], [0.35, 1]),
									}}
								/>
							) : crosses ? (
								<svg
									viewBox="0 0 10 10"
									style={{ position: "absolute", inset: 0, opacity: t * 0.9, scale: interpolate(t, [0, 1], [0.6, 1]) }}
								>
									<path d="M2.5 2.5l5 5M7.5 2.5l-5 5" stroke={C.dim} strokeWidth={1.1} strokeLinecap="round" />
								</svg>
							) : null}
						</div>
					);
				}),
			)}
		</div>
	);
};
