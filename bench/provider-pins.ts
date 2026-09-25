import snapshot from "./provider-pins.json";

type Endpoint = { providerName: string; tag: string; quantization: string };
type ModelSnapshot = { firstPartyQuantization: string | null; endpoints: Endpoint[] };
const models = snapshot.models as Record<string, ModelSnapshot>;

export function firstPartyAvailableFor(modelId: string, slug: string): boolean {
  return models[modelId]?.endpoints.some((endpoint) => endpoint.tag === slug || endpoint.tag.startsWith(`${slug}/`)) ?? false;
}

// A provider can have multiple quantizations for one model. In that case the
// activity export's provider name alone does not identify the serving variant.
export function quantizationFor(modelId: string, providerName?: string | null): string | null {
  const entry = models[modelId];
  if (!entry) return null;
  if (!providerName) return entry.firstPartyQuantization === "unknown" ? null : entry.firstPartyQuantization;
  const values = [...new Set(entry.endpoints.filter((endpoint) => endpoint.providerName === providerName
    || endpoint.tag === providerName || endpoint.tag.startsWith(`${providerName}/`)).map((endpoint) => endpoint.quantization))];
  return values.length === 1 && values[0] !== "unknown" ? values[0] ?? null : null;
}
