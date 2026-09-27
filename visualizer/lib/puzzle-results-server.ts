import { readFile } from "node:fs/promises";
import path from "node:path";
import type { PuzzleExport } from "./puzzle-insights";
import { applyFilters, filtersForPuzzle, type Filters } from "./leaderboard";
import { getVariants } from "./data";

let cached: Promise<PuzzleExport> | undefined;
export function loadPuzzleResults() {
  cached ??= readFile(path.join(process.cwd(), "public/puzzle-results.json"), "utf8").then((text) => JSON.parse(text) as PuzzleExport);
  return cached;
}

export function filteredModelIds(filters: Filters, puzzleSize: string) {
  return new Set(applyFilters(getVariants().map((model) => ({ ...model, family: model.family ?? model.model, effort: model.effort ?? "none", provider: model.provider ?? "" })), filtersForPuzzle(filters, puzzleSize)).map((model) => model.model));
}
