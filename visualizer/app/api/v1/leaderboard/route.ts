import { apiError } from "@/lib/api";
import { getLeaderboard, RESULTS_TIMESTAMP, SIZES } from "@/lib/data";

export function GET(request: Request) {
	const size = new URL(request.url).searchParams.get("size") ?? undefined;
	if (size && !SIZES.includes(size)) return apiError(400, `Unknown size "${size}". Use one of: ${SIZES.join(", ")}.`);
	return Response.json({ updatedAt: RESULTS_TIMESTAMP, size: size ?? "all", models: getLeaderboard(size) });
}
