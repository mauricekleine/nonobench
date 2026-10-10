import {
  compareModels,
  findPuzzle,
  getLeaderboard,
  getModel,
  getPuzzle,
  getVariants,
  listFamilies,
  listProviders,
  listPuzzles,
  listRuns,
  RESULTS_TIMESTAMP,
  SIZES,
} from "@/lib/data";
import { parseApiFilters, validateFilters } from "@/lib/leaderboard";
import { checkClues } from "@/lib/nonogram";
import { runState } from "@/lib/puzzle-insights";
import { filteredModelIds, loadPuzzleResults } from "@/lib/puzzle-results-server";

// The read-only REST API under /api/v1. Every handler gets the request and
// the decoded path parameters.

type Params = Record<string, string>;

// JSON error bodies for the REST API.
export function apiError(status: number, message: string) {
  return Response.json({ error: message }, { status });
}

const leaderboardVariants = () =>
  getVariants().map((model) => ({
    ...model,
    family: model.family ?? model.model,
    effort: model.effort ?? "none",
    provider: model.provider ?? "",
  }));

export function health() {
  return Response.json({ status: "ok", resultsUpdatedAt: RESULTS_TIMESTAMP });
}

export function leaderboard(request: Request) {
  const { filters, error } = parseApiFilters(new URL(request.url).searchParams);
  const invalid = error ?? validateFilters(leaderboardVariants(), filters, SIZES);
  if (invalid) return apiError(400, invalid);
  return Response.json({
    updatedAt: RESULTS_TIMESTAMP,
    size: filters.size ?? "all",
    models: getLeaderboard(filters.size, filters),
  });
}

export function providers() {
  return Response.json({ providers: listProviders() });
}

export function families() {
  return Response.json({ families: listFamilies() });
}

export async function compare(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, "Expected JSON body with a models array.");
  }
  const names = (body as { models?: unknown })?.models;
  if (
    !Array.isArray(names) ||
    names.length < 2 ||
    names.length > 20 ||
    names.some((name) => typeof name !== "string" || !name.trim())
  ) {
    return apiError(400, "models must be an array of 2–20 non-empty model IDs or family names.");
  }
  const models = compareModels(names as string[]);
  const missing = names.filter((_, index) => !models[index]);
  return missing.length
    ? apiError(
        400,
        `Unknown model or family: ${missing.join(", ")}. Use /api/v1/families for names.`,
      )
    : Response.json({ models });
}

export function model(_request: Request, { model }: Params) {
  const data = getModel(decodeURIComponent(model));
  return data
    ? Response.json(data)
    : apiError(404, `Unknown model "${model}". See /api/v1/leaderboard for model names.`);
}

export async function modelPuzzles(_request: Request, { model }: Params) {
  const metadata = getModel(model);
  if (!metadata) return apiError(404, `Unknown model "${model}".`);
  const puzzles = (await loadPuzzleResults()).puzzles.map((puzzle) => {
    const run = puzzle.runs.find((entry) => entry.model === model);
    return {
      id: puzzle.id,
      index: puzzle.index,
      size: puzzle.size,
      solveRate: puzzle.solveRate,
      state: runState(run),
      ...(run
        ? { correct: run.correct, status: run.status, cost: run.cost, durationMs: run.durationMs }
        : {}),
    };
  });
  return Response.json({
    model,
    displayName: metadata.displayName,
    solved: puzzles.filter((puzzle) => puzzle.state === "solved").length,
    attempted: puzzles.filter((puzzle) => puzzle.state !== "not-run").length,
    puzzles,
  });
}

export function puzzles(request: Request) {
  const size = new URL(request.url).searchParams.get("size") ?? undefined;
  if (size && !SIZES.includes(size))
    return apiError(400, `Unknown size "${size}". Use one of: ${SIZES.join(", ")}.`);
  return Response.json({ puzzles: listPuzzles(size) });
}

export function puzzle(request: Request, { id }: Params) {
  const includeSolution = new URL(request.url).searchParams.get("include_solution") === "true";
  const data = getPuzzle(id, includeSolution);
  return data ? Response.json(data) : apiError(404, `Unknown puzzle "${id}".`);
}

export async function checkPuzzle(request: Request, { id }: Params) {
  const found = findPuzzle(id);
  if (!found) return apiError(404, `Unknown puzzle "${id}".`);
  const body = (await request.json().catch(() => null)) as { grid?: unknown } | null;
  if (typeof body?.grid !== "string") return apiError(400, 'Send JSON like {"grid": "0110..."}.');
  return Response.json(checkClues(found.puzzle, body.grid.replace(/\s/g, "")));
}

export async function puzzleResults(request: Request, { id }: Params) {
  if (!getPuzzle(id)) return apiError(404, `Unknown puzzle "${id}".`);
  const search = new URL(request.url).searchParams;
  if (search.has("size")) return apiError(400, "A puzzle has one size; omit the size filter.");
  const { filters, error } = parseApiFilters(search);
  const invalid = error ?? validateFilters(leaderboardVariants(), filters, SIZES);
  if (invalid) return apiError(400, invalid);
  const includeAnswers = search.get("include_answers");
  if (includeAnswers !== null && includeAnswers !== "true" && includeAnswers !== "false") {
    return apiError(400, 'Invalid include_answers. Use "true" or "false".');
  }
  const puzzle = (await loadPuzzleResults()).puzzles.find((entry) => entry.id === id);
  if (!puzzle) return apiError(404, `No results for puzzle "${id}".`);
  const selected = filteredModelIds(filters, puzzle.size);
  const models = getVariants();
  const runs = puzzle.runs
    .filter((run) => selected.has(run.model))
    .map((run) => {
      const model = models.find((entry) => entry.model === run.model);
      const { answer, ...rest } = run;
      return {
        ...rest,
        displayName: model?.displayName ?? run.model,
        family: model?.family ?? run.model,
        effort: model?.effort ?? null,
        provider: model?.provider ?? null,
        ...(includeAnswers === "true" ? { answer } : {}),
      };
    });
  return Response.json({
    updatedAt: RESULTS_TIMESTAMP,
    puzzleId: id,
    index: puzzle.index,
    size: puzzle.size,
    attempts: runs.length,
    solved: runs.filter((run) => run.correct).length,
    runs,
  });
}

export async function runs(request: Request) {
  const params = new URL(request.url).searchParams;
  const number = (key: string) => (params.has(key) ? Number(params.get(key)) : undefined);
  const limit = number("limit");
  const offset = number("offset");
  if ([limit, offset].some((value) => value !== undefined && !Number.isInteger(value))) {
    return apiError(400, "limit and offset must be integers.");
  }
  return Response.json(
    await listRuns({
      model: params.get("model") ?? undefined,
      puzzleId: params.get("puzzle") ?? undefined,
      size: params.get("size") ?? undefined,
      includeOutput: params.get("include_output") === "true",
      limit,
      offset,
    }),
  );
}
