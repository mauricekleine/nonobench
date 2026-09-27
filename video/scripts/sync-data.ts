// Pulls the numbers the announcement video shows from a running Nonobench site
// (the public API at /api/v1) into src/data/nonobench.json, so the video follows
// the benchmark instead of hard-coding it. Re-run once the final v1.2 data is in:
//
//   bun run sync-data                                          # production
//   bun run sync-data -- --from http://localhost:3850          # local dev site
//
// The Standard score covers the 30 core puzzles (5x5, 10x10, 15x15); Hard mode
// (20x20) is reported separately, like the site does.

import { writeFile } from "node:fs/promises";
import { join } from "node:path";

const args = process.argv.slice(2);
const fromIndex = args.indexOf("--from");
const BASE = (fromIndex >= 0 ? args[fromIndex + 1] : "https://www.nonobench.com").replace(/\/$/, "");

// The puzzles the video draws: the 5x5 from the how-it-works prompt, and for
// Hard mode the 20x20 the fewest runs solved (but someone did).
const INTRO_PUZZLE_INDEX = 0;
const LEADERBOARD_ROWS = 10;
const STANDARD_SIZES = ["5x5", "10x10", "15x15"] as const;
const VERSIONS = ["1.0", "1.1", "1.2"] as const;

type LeaderboardRow = {
	rank: number;
	model: string;
	familyDisplayName: string;
	family: string;
	effort: string;
	provider: string;
	version: string;
	complete: boolean;
	accuracy: number;
	correct: number;
	total: number;
	totalCostUsd: number;
};

type SizeResult = {
	size: string;
	accuracy: number;
	correct: number;
	total: number;
	avgDurationMs: number;
	totalCostUsd: number;
};

type PuzzleDetail = {
	id: string;
	index: number;
	size: string;
	width: number;
	height: number;
	rowClues: number[][];
	columnClues: number[][];
	referenceSolution: string;
};

async function get<T>(path: string): Promise<T> {
	const response = await fetch(`${BASE}${path}`);
	if (!response.ok) throw new Error(`${path}: ${response.status} ${await response.text()}`);
	return response.json() as Promise<T>;
}

// 95% Wilson interval, the thin ranges on the site's leaderboard.
function wilson(correct: number, total: number) {
	if (total === 0) return { low: 0, high: 0 };
	const z = 1.96;
	const p = correct / total;
	const denominator = 1 + (z * z) / total;
	const center = (p + (z * z) / (2 * total)) / denominator;
	const margin = (z * Math.sqrt((p * (1 - p)) / total + (z * z) / (4 * total * total))) / denominator;
	return { low: Math.max(0, center - margin) * 100, high: Math.min(1, center + margin) * 100 };
}

function puzzleShape(puzzle: PuzzleDetail) {
	return {
		id: puzzle.id,
		index: puzzle.index,
		width: puzzle.width,
		height: puzzle.height,
		rowClues: puzzle.rowClues,
		columnClues: puzzle.columnClues,
		solution: puzzle.referenceSolution,
	};
}

const { updatedAt, models: rows } = await get<{ updatedAt: string; models: LeaderboardRow[] }>("/api/v1/leaderboard");
const solved = rows.filter((row) => row.correct > 0);

// One row per family, its best-ranked variant: the site's default view. A run
// still in progress only stands in for a family that has no complete variant.
const byFamily = Map.groupBy(solved, (row) => row.family);
const familyBest = [...byFamily.values()]
	.map((variants) => variants.find((row) => row.complete) ?? variants[0])
	.sort((a, b) => a.rank - b.rank);

const details = await Promise.all(
	familyBest.map((row) => get<{ model: string; bySize: SizeResult[] }>(`/api/v1/models/${encodeURIComponent(row.model)}`)),
);
const bySizeFor = new Map(details.map((detail) => [detail.model, detail.bySize]));

// Grid-size cliff: combined solve rate of the family-best variants per size.
const sizeCliff = STANDARD_SIZES.map((size) => {
	let correct = 0;
	let total = 0;
	for (const row of familyBest) {
		const result = bySizeFor.get(row.model)?.find((entry) => entry.size === size);
		correct += result?.correct ?? 0;
		total += result?.total ?? 0;
	}
	return { size, correct, total, accuracy: total ? (correct / total) * 100 : 0 };
});

// Best 15x15 score per benchmark version: the ceiling v1.2 finally hit.
const fifteenRecords = await Promise.all(
	VERSIONS.map(async (version) => {
		const { models } = await get<{ models: LeaderboardRow[] }>(`/api/v1/leaderboard?size=15x15&version=${version}`);
		const best = models.filter((row) => row.complete).sort((a, b) => b.correct - a.correct || a.rank - b.rank)[0];
		return { version, name: best.familyDisplayName, provider: best.provider, effort: best.effort, correct: best.correct, total: best.total };
	}),
);

const perfect = solved.filter((row) => row.complete && row.total >= 30 && row.correct === row.total);
const champion = familyBest[0];

const { puzzles } = await get<{ puzzles: { id: string; index: number; size: string }[] }>("/api/v1/puzzles");
const puzzleDetail = (id: string) => get<PuzzleDetail>(`/api/v1/puzzles/${id}?include_solution=true`);
const standard = await Promise.all(puzzles.filter((puzzle) => puzzle.size !== "20x20").map((puzzle) => puzzleDetail(puzzle.id)));
const intro = standard[INTRO_PUZZLE_INDEX];
const hardResults = await Promise.all(
	puzzles
		.filter((puzzle) => puzzle.size === "20x20")
		.map((puzzle) => get<{ puzzleId: string; attempts: number; solved: number }>(`/api/v1/puzzles/${puzzle.id}/results`)),
);
const hardPick = hardResults.filter((entry) => entry.solved > 0).sort((a, b) => a.solved - b.solved || b.attempts - a.attempts)[0] ?? hardResults[0];
const hard = await puzzleDetail(hardPick.puzzleId);

// The champion's answer on every Standard puzzle, for the perfect-run tiles.
const championRun = await get<{ puzzles: { id: string; size: string; correct: boolean; solveRate: number; durationMs: number }[] }>(
	`/api/v1/models/${encodeURIComponent(champion.model)}/puzzles`,
);
const championById = new Map(championRun.puzzles.map((entry) => [entry.id, entry]));

// The champion's family across every effort level it ran, in effort order.
const EFFORT_ORDER = ["none", "minimal", "low", "medium", "high", "xhigh", "max"];
const championLadder = solved
	.filter((row) => row.family === champion.family && row.complete)
	.sort((a, b) => EFFORT_ORDER.indexOf(a.effort) - EFFORT_ORDER.indexOf(b.effort))
	.map((row) => ({ effort: row.effort, correct: row.correct, total: row.total }));
const { models: hardRows } = await get<{ models: LeaderboardRow[] }>("/api/v1/leaderboard?size=20x20");
// Each family's best Hard mode result (Fable ran it at high and xhigh).
const hardFamilies = [...Map.groupBy(hardRows.filter((row) => row.total > 0), (row) => row.family).values()].map(
	(variants) => variants.sort((a, b) => b.correct - a.correct || a.rank - b.rank)[0],
);

const data = {
	source: BASE,
	syncedAt: new Date().toISOString(),
	updatedAt,
	counts: {
		models: familyBest.length,
		variants: solved.length,
		standardPuzzles: puzzles.filter((puzzle) => puzzle.size !== "20x20").length,
		hardPuzzles: puzzles.filter((puzzle) => puzzle.size === "20x20").length,
	},
	champion: {
		name: champion.familyDisplayName,
		effort: champion.effort,
		provider: champion.provider,
		correct: champion.correct,
		total: champion.total,
		totalCostUsd: champion.totalCostUsd,
		bySize: (bySizeFor.get(champion.model) ?? []).map(({ size, correct, total, avgDurationMs }) => ({ size, correct, total, avgDurationMs })),
	},
	championLadder,
	perfectRuns: perfect.map((row) => ({ name: row.familyDisplayName, effort: row.effort, version: row.version })),
	leaderboard: familyBest.slice(0, LEADERBOARD_ROWS).map((row) => ({
		name: row.familyDisplayName,
		provider: row.provider,
		effort: row.effort,
		accuracy: row.accuracy,
		correct: row.correct,
		total: row.total,
		complete: row.complete,
		...wilson(row.correct, row.total),
	})),
	sizeCliff,
	fifteenRecords,
	hardMode: {
		// Families that ran Hard mode, each with its best variant there.
		families: hardFamilies.length,
		puzzle: { id: hardPick.puzzleId, solved: hardPick.solved, attempts: hardPick.attempts },
		results: hardFamilies
			.filter((row) => row.correct > 0)
			.sort((a, b) => b.correct - a.correct || a.rank - b.rank)
			.slice(0, LEADERBOARD_ROWS)
			.map((row) => ({
				name: row.familyDisplayName,
				provider: row.provider,
				effort: row.effort,
				accuracy: row.accuracy,
				correct: row.correct,
				total: row.total,
			})),
	},
	puzzles: {
		intro: puzzleShape(intro),
		hard: puzzleShape(hard),
		standard: standard.map((puzzle) => ({
			...puzzleShape(puzzle),
			size: puzzle.size,
			solveRate: championById.get(puzzle.id)?.solveRate ?? null,
			championSolved: championById.get(puzzle.id)?.correct ?? false,
			championDurationMs: championById.get(puzzle.id)?.durationMs ?? null,
		})),
	},
};

const out = join(import.meta.dir, "../src/data/nonobench.json");
await writeFile(out, `${JSON.stringify(data, null, "\t")}\n`);

console.log(`Synced from ${BASE} (updated ${updatedAt})`);
console.log(`  ${data.counts.models} models · ${data.counts.variants} variants · ${data.counts.standardPuzzles}+${data.counts.hardPuzzles} puzzles`);
console.log(`  #1 ${data.champion.name} (${data.champion.effort}) ${data.champion.correct}/${data.champion.total}`);
console.log(`  perfect runs: ${data.perfectRuns.map((run) => `${run.name} ${run.effort}`).join(", ") || "none"}`);
console.log(`  size cliff: ${sizeCliff.map((entry) => `${entry.size} ${entry.accuracy.toFixed(1)}%`).join(" · ")}`);
console.log(`  best 15x15: ${fifteenRecords.map((entry) => `v${entry.version} ${entry.correct}/${entry.total}`).join(" · ")}`);
console.log(`  ladder: ${championLadder.map((step) => `${step.effort} ${step.correct}`).join(" · ")}`);
console.log(`  hard mode: ${data.hardMode.families} families ran it; ${data.hardMode.results.map((row) => `${row.name} ${row.effort} ${row.correct}/${row.total}`).join(" · ")}`);
console.log(`  hard puzzle: #${hard.index + 1} solved in ${hardPick.solved}/${hardPick.attempts} runs`);
