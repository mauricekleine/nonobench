import { apiError } from "@/lib/api";
import { findPuzzle } from "@/lib/data";
import { checkClues } from "@/lib/nonogram";

export async function POST(request: Request, { params }: RouteContext<"/api/v1/puzzles/[id]/check">) {
	const { id } = await params;
	const found = findPuzzle(id);
	if (!found) return apiError(404, `Unknown puzzle "${id}".`);
	const body = (await request.json().catch(() => null)) as { grid?: unknown } | null;
	if (typeof body?.grid !== "string") return apiError(400, 'Send JSON like {"grid": "0110..."}.');
	return Response.json(checkClues(found.puzzle, body.grid.replace(/\s/g, "")));
}
