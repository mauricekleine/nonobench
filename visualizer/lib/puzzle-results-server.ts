import type { PuzzleExport } from "./puzzle-insights";
import { applyFilters, filtersForPuzzle, type Filters } from "./leaderboard";
import { cachedAsset } from "./assets";
import { getVariants } from "./data";

export const loadPuzzleResults = cachedAsset<PuzzleExport>("/puzzle-results.json");

export function filteredModelIds(filters: Filters, puzzleSize: string) {
  return new Set(applyFilters(getVariants().map((model) => ({ ...model, family: model.family ?? model.model, effort: model.effort ?? "none", provider: model.provider ?? "" })), filtersForPuzzle(filters, puzzleSize)).map((model) => model.model));
}
