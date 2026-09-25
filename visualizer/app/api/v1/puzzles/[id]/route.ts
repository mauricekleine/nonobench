import { apiError } from "@/lib/api";
import { getPuzzle } from "@/lib/data";

export async function GET(request: Request, { params }: RouteContext<"/api/v1/puzzles/[id]">) {
	const { id } = await params;
	const includeSolution = new URL(request.url).searchParams.get("include_solution") === "true";
	const puzzle = getPuzzle(id, includeSolution);
	return puzzle ? Response.json(puzzle) : apiError(404, `Unknown puzzle "${id}".`);
}
