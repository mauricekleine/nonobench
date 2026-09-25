import { apiError } from "@/lib/api";
import { getPuzzle, getVariants, RESULTS_TIMESTAMP, SIZES } from "@/lib/data";
import { parseApiFilters, validateFilters } from "@/lib/leaderboard";
import { filteredModelIds, loadPuzzleResults } from "@/lib/puzzle-results-server";

export async function GET(request: Request, { params }: RouteContext<"/api/v1/puzzles/[id]/results">) {
  const { id } = await params;
  if (!getPuzzle(id)) return apiError(404, `Unknown puzzle "${id}".`);
  const search = new URL(request.url).searchParams;
  if (search.has("size")) return apiError(400, "A puzzle has one size; omit the size filter.");
  const { filters, error } = parseApiFilters(search);
  const invalid = error ?? validateFilters(getVariants().map((model) => ({ ...model, family: model.family ?? model.model, effort: model.effort ?? "none", provider: model.provider ?? "" })), filters, SIZES);
  if (invalid) return apiError(400, invalid);
  const includeAnswers = search.get("include_answers");
  if (includeAnswers !== null && includeAnswers !== "true" && includeAnswers !== "false") return apiError(400, 'Invalid include_answers. Use "true" or "false".');
  const puzzle = (await loadPuzzleResults()).puzzles.find((entry) => entry.id === id);
  if (!puzzle) return apiError(404, `No results for puzzle "${id}".`);
  const selected = filteredModelIds(filters);
  const models = getVariants();
  const runs = puzzle.runs.filter((run) => selected.has(run.model)).map((run) => {
    const model = models.find((entry) => entry.model === run.model);
    const { answer, ...rest } = run;
    return { ...rest, displayName: model?.displayName ?? run.model, family: model?.family ?? run.model,
      effort: model?.effort ?? null, provider: model?.provider ?? null, ...(includeAnswers === "true" ? { answer } : {}) };
  });
  return Response.json({ updatedAt: RESULTS_TIMESTAMP, puzzleId: id, index: puzzle.index,
    size: puzzle.size, attempts: runs.length, solved: runs.filter((run) => run.correct).length, runs });
}
