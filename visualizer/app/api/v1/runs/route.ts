import { apiError } from "@/lib/api";
import { listRuns } from "@/lib/data";

export async function GET(request: Request) {
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
