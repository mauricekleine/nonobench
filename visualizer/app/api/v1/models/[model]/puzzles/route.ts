import { apiError } from "@/lib/api";
import { getModel } from "@/lib/data";
import { loadPuzzleResults } from "@/lib/puzzle-results-server";
import { runState } from "@/lib/puzzle-insights";

export async function GET(_request: Request, { params }: RouteContext<"/api/v1/models/[model]/puzzles">) {
  const { model } = await params;
  const metadata = getModel(model);
  if (!metadata) return apiError(404, `Unknown model "${model}".`);
  const puzzles = (await loadPuzzleResults()).puzzles.map((puzzle) => {
    const run = puzzle.runs.find((entry) => entry.model === model);
    return { id: puzzle.id, index: puzzle.index, size: puzzle.size, solveRate: puzzle.solveRate,
      state: runState(run), ...(run ? { correct: run.correct, status: run.status, cost: run.cost, durationMs: run.durationMs } : {}) };
  });
  return Response.json({ model, displayName: metadata.displayName, solved: puzzles.filter((puzzle) => puzzle.state === "solved").length,
    attempted: puzzles.filter((puzzle) => puzzle.state !== "not-run").length, puzzles });
}
