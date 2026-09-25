import { RESULTS_TIMESTAMP } from "@/lib/data";

export function GET() {
	return Response.json({ status: "ok", resultsUpdatedAt: RESULTS_TIMESTAMP });
}
