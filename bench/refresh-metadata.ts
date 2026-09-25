import { MODELS } from "./constants";

type OpenRouterModel = { id: string; name: string; created?: number; hugging_face_id?: string | null };
const response = await fetch("https://openrouter.ai/api/v1/models");
if (!response.ok) throw new Error(`OpenRouter model list failed: HTTP ${response.status}`);
const listing = (await response.json()) as { data: OpenRouterModel[] };
if (!Array.isArray(listing.data)) throw new Error("OpenRouter model list has no data array");
const models = new Map(listing.data.map((model) => [model.id, model]));
const ids = [...new Set(MODELS.map((model) => model.llm.modelId))].sort();
const familyName = (id: string) => {
	const family = MODELS.find((model) => model.llm.modelId === id)?.family ?? id.split("/")[1] ?? id;
	return family.split("-").map((part) => /^\d/.test(part) ? part : part.toUpperCase() === "AI" ? part : part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
};
const snapshot = Object.fromEntries(ids.map((id) => {
	const model = models.get(id);
	return [id, {
		displayName: model?.name.replace(/^[^:]+:\s*/, "") ?? familyName(id),
		openWeights: model ? typeof model.hugging_face_id === "string" && model.hugging_face_id.trim().length > 0 : null,
		addedAt: model && Number.isFinite(model.created) ? new Date(model.created! * 1000).toISOString() : null,
	}];
}));
await Bun.write(new URL("./model-metadata.json", import.meta.url), `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(`Saved ${ids.length} OpenRouter IDs (${ids.filter((id) => !models.has(id)).length} retired).`);
