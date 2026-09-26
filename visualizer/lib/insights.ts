// Pure helpers for the analysis charts: uncertainty on small samples, the
// accuracy-vs-cost frontier, and ordering of reasoning-effort levels.

// Wilson score interval for a binomial proportion. With 30 puzzles a single
// puzzle is 3.3 points, so scores come with visible uncertainty; Wilson stays
// sensible at 0% and 100%, where the normal approximation collapses.
export function wilsonInterval(correct: number, total: number, z = 1.96): { low: number; high: number } {
	if (total <= 0) return { low: 0, high: 0 };
	const p = correct / total;
	const z2 = z * z;
	const denominator = 1 + z2 / total;
	const centre = (p + z2 / (2 * total)) / denominator;
	const margin = (z * Math.sqrt((p * (1 - p)) / total + z2 / (4 * total * total))) / denominator;
	return { low: Math.max(0, centre - margin), high: Math.min(1, centre + margin) };
}

export type FrontierPoint = { id: string; x: number; y: number };

// Points no other point beats: nothing is at least as cheap (lower x) and at
// least as accurate (higher y) while strictly better on one of the two.
// Returned sorted by x, ready to draw as a step line.
export function paretoFrontier<T extends FrontierPoint>(points: T[]): T[] {
	const sorted = [...points]
		.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
		.sort((a, b) => a.x - b.x || b.y - a.y);
	const frontier: T[] = [];
	let best = Number.NEGATIVE_INFINITY;
	for (const point of sorted) {
		if (point.y > best) {
			frontier.push(point);
			best = point.y;
		}
	}
	return frontier;
}

// Reasoning-effort levels from least to most thinking. "default" (provider
// default, level unknown) and unknown values sort last.
export const EFFORT_ORDER = ["none", "minimal", "low", "medium", "high", "xhigh", "max"] as const;

export function effortRank(effort: string): number {
	const index = (EFFORT_ORDER as readonly string[]).indexOf(effort);
	return index === -1 ? EFFORT_ORDER.length : index;
}
