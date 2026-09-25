import { apiError } from "@/lib/api";
import { listPuzzles, SIZES } from "@/lib/data";

export function GET(request: Request) {
	const size = new URL(request.url).searchParams.get("size") ?? undefined;
	if (size && !SIZES.includes(size)) return apiError(400, `Unknown size "${size}". Use one of: ${SIZES.join(", ")}.`);
	return Response.json({ puzzles: listPuzzles(size) });
}
