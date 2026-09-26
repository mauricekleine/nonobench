import data from "./nonobench.json";

// Everything the video says about the benchmark comes from here. Refresh it
// with `bun run sync-data` (see scripts/sync-data.ts) once new runs land.
export const NB = data;

export type LeaderboardEntry = (typeof data.leaderboard)[number];
