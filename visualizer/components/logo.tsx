// The Nonobench mark: a solved 3x3 nonogram in the grid-size colours. Also
// drawn by app/opengraph-image.tsx; app/icon.svg is a static copy.
export const LOGO_CELLS = [
	["#70B8FF", "#70B8FF", null],
	[null, "#46FEA5", "#46FEA5"],
	["#FFCA16", null, "#FFCA16"],
] as const;

export function Logo({ className }: { className?: string }) {
	return (
		<svg viewBox="0 0 23 23" className={className} aria-label="Nonobench" role="img">
			{LOGO_CELLS.flatMap((row, y) =>
				row.map((color, x) => (
					<rect
						key={`${x}-${y}`}
						x={x * 8.5}
						y={y * 8.5}
						width={6}
						height={6}
						rx={1.5}
						fill={color ?? "currentColor"}
						fillOpacity={color ? 1 : 0.1}
					/>
				)),
			)}
		</svg>
	);
}
