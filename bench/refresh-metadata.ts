import { MODELS } from "./constants";
import familyDisplayNames from "./family-display-names.json";
import overrides from "./model-metadata-overrides.json";

type OpenRouterModel = { id: string; name: string; created?: number; hugging_face_id?: string | null };
const response = await fetch("https://openrouter.ai/api/v1/models");
if (!response.ok) throw new Error(`OpenRouter model list failed: HTTP ${response.status}`);
const listing = (await response.json()) as { data: OpenRouterModel[] };
if (!Array.isArray(listing.data)) throw new Error("OpenRouter model list has no data array");
const models = new Map(listing.data.map((model) => [model.id, model]));
const ids = [...new Set(MODELS.map((model) => model.llm.modelId))].sort();
const familyName = (id: string) => {
	const family = MODELS.find((model) => model.llm.modelId === id)?.family ?? id.split("/")[1] ?? id;
	const displayName = (familyDisplayNames as Record<string, string>)[family];
	if (!displayName) throw new Error(`Missing family display name for ${family}`);
	return displayName;
};
const weightOverrides = overrides as Record<string, { openWeights: boolean; sourceUrl: string }>;
for (const [id, override] of Object.entries(weightOverrides)) {
	if (!ids.includes(id)) throw new Error(`Override has unknown OpenRouter id: ${id}`);
	if (!override.sourceUrl.startsWith("https://huggingface.co/")) throw new Error(`Override ${id} needs a public Hugging Face source URL`);
}
const snapshot = Object.fromEntries(ids.map((id) => {
	const model = models.get(id);
	const openRouterName = model?.name.replace(/^[^:]+:\s*/, "").replace(/\s+\((?:\d{4,8}|v?\d+(?:\.\d+)*)\)$/i, "");
	return [id, {
		displayName: openRouterName ?? familyName(id),
		openWeights: weightOverrides[id]?.openWeights ?? (model ? typeof model.hugging_face_id === "string" && model.hugging_face_id.trim().length > 0 : null),
		addedAt: model && Number.isFinite(model.created) ? new Date(model.created! * 1000).toISOString() : null,
	}];
}));
await Bun.write(new URL("./model-metadata.json", import.meta.url), `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(`Saved ${ids.length} OpenRouter IDs (${ids.filter((id) => !models.has(id)).length} retired).`);
