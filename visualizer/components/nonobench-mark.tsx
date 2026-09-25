import { cn } from "@/lib/utils";

// The Nonobench mark, drawn as the puzzle it is: a solved 3x3 nonogram with its
// row and column clues. Filled cells carry the grid-size colours (same pattern as
// the favicon); empty cells get crossed out on hover, the way a solver finishes.
const CELLS = [
	["#70B8FF", "#70B8FF", null],
	[null, "#46FEA5", "#46FEA5"],
	["#FFCA16", null, "#FFCA16"],
] as const;

function runs(line: readonly (string | null)[]): number[] {
	const result: number[] = [];
	let run = 0;
	for (const cell of line) {
		if (cell) run++;
		else if (run > 0) {
			result.push(run);
			run = 0;
		}
	}
	if (run > 0) result.push(run);
	return result;
}

const ROW_CLUES = CELLS.map(runs);
const COLUMN_CLUES = CELLS[0].map((_, x) => runs(CELLS.map((row) => row[x])));
// Reading order of the empty cells, so the crosses land one after another.
const CROSS_ORDER = new Map(
	CELLS.flatMap((row, y) => row.map((color, x) => (color ? null : `${x}-${y}`))).filter((key) => key !== null).map((key, i) => [key, i]),
);

export function NonobenchMark({ size = "md", className }: { size?: "sm" | "md"; className?: string }) {
	const cell = size === "md" ? "size-2.5" : "size-2";

	return (
		<div
			aria-hidden="true"
			className={cn(
				"nono-mark grid shrink-0 grid-cols-[auto_repeat(3,auto)] gap-[3px] font-mono text-dim",
				size === "md" ? "text-[9px]" : "text-[8px]",
				"leading-none",
				className,
			)}
		>
			<span />
			{COLUMN_CLUES.map((clue, x) => (
				<span key={`c${x}`} className="flex flex-col items-center justify-end gap-px pb-0.5">
					{clue.map((n, i) => (
						<span key={i}>{n}</span>
					))}
				</span>
			))}
			{CELLS.map((row, y) => [
				<span key={`r${y}`} className="flex items-center justify-end gap-0.5 pr-1">
					{ROW_CLUES[y].map((n, i) => (
						<span key={i}>{n}</span>
					))}
				</span>,
				...row.map((color, x) => {
					if (color) {
						return <span key={`${x}-${y}`} className={cn(cell, "rounded-[2px]")} style={{ backgroundColor: color }} />;
					}
					return (
						<span
							key={`${x}-${y}`}
							className={cn(cell, "relative rounded-[2px] bg-foreground/[0.07] ring-1 ring-inset ring-foreground/10")}
						>
							<svg viewBox="0 0 10 10" className="nono-cross absolute inset-0 text-dim" style={{ ["--i" as string]: CROSS_ORDER.get(`${x}-${y}`) }}>
								<path d="M2.5 2.5l5 5M7.5 2.5l-5 5" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" />
							</svg>
						</span>
					);
				}),
			])}
		</div>
	);
}
