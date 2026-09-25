import { apiError } from "@/lib/api";
import { getModel } from "@/lib/data";

export async function GET(_request: Request, { params }: RouteContext<"/api/v1/models/[model]">) {
	const { model } = await params;
	const data = getModel(decodeURIComponent(model));
	return data ? Response.json(data) : apiError(404, `Unknown model "${model}". See /api/v1/leaderboard for model names.`);
}
