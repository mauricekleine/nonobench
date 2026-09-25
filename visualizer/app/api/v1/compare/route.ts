import { apiError } from "@/lib/api";
import { compareModels } from "@/lib/data";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, "Expected JSON body with a models array.");
  }
  const names = (body as { models?: unknown })?.models;
  if (
    !Array.isArray(names) ||
    names.length < 2 ||
    names.length > 20 ||
    names.some((name) => typeof name !== "string" || !name.trim())
  ) {
    return apiError(
      400,
      "models must be an array of 2–20 non-empty model IDs or family names.",
    );
  }
  const models = compareModels(names as string[]);
  const missing = names.filter((_, index) => !models[index]);
  return missing.length
    ? apiError(
        400,
        `Unknown model or family: ${missing.join(", ")}. Use /api/v1/families for names.`,
      )
    : Response.json({ models });
}
