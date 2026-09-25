// JSON error bodies for the REST API.
export function apiError(status: number, message: string) {
	return Response.json({ error: message }, { status });
}
