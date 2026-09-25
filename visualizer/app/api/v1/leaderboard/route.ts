import { apiError } from "@/lib/api";
import { getLeaderboard, getVariants, RESULTS_TIMESTAMP, SIZES } from "@/lib/data";
import { parseApiFilters, validateFilters } from "@/lib/leaderboard";

export function GET(request: Request) {
	const { filters, error } = parseApiFilters(new URL(request.url).searchParams);
	const invalid = error ?? validateFilters(getVariants().map((model) => ({ ...model, family: model.family ?? model.model, effort: model.effort ?? "none", provider: model.provider ?? "" })), filters, SIZES);
	if (invalid) return apiError(400, invalid);
	return Response.json({ updatedAt: RESULTS_TIMESTAMP, size: filters.size ?? "all", models: getLeaderboard(filters.size, filters) });
}
