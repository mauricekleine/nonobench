import { MODELS, pinnedProviderFor } from "./constants";

type Endpoint = {
  provider_name: string;
  tag: string;
  quantization: string;
  supported_parameters: string[];
};

const ids = [...new Set(MODELS.map((model) => model.llm.modelId))].sort();
const models: Record<string, {
  pins: string[];
  firstPartyAvailable: boolean;
  firstPartyStructuredOutputs: boolean | null;
  firstPartyQuantization: string | null;
  endpoints: Array<{ providerName: string; tag: string; quantization: string; structuredOutputs: boolean }>;
}> = {};

for (const id of ids) {
  const pins = [...new Set(MODELS.filter((model) => model.llm.modelId === id).map(pinnedProviderFor))];
  const url = `https://openrouter.ai/api/v1/models/${id}/endpoints`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  const body = await response.json() as { data: { endpoints: Endpoint[] } };
  const endpoints = body.data.endpoints.map((endpoint) => ({
    providerName: endpoint.provider_name,
    tag: endpoint.tag,
    quantization: endpoint.quantization,
    structuredOutputs: endpoint.supported_parameters.includes("structured_outputs"),
  }));
  const firstParty = endpoints.filter((endpoint) => pins.some((pin) => endpoint.tag === pin || endpoint.tag.startsWith(`${pin}/`)));
  const preferred = firstParty.find((endpoint) => pins.includes(endpoint.tag)) ?? firstParty[0];
  models[id] = {
    pins,
    firstPartyAvailable: firstParty.length > 0,
    firstPartyStructuredOutputs: firstParty.length ? firstParty.every((endpoint) => endpoint.structuredOutputs) : null,
    firstPartyQuantization: preferred?.quantization ?? null,
    endpoints,
  };
}

const snapshot = {
  generatedAt: new Date().toISOString(),
  source: "https://openrouter.ai/api/v1/models/{author}/{slug}/endpoints",
  models,
};
await Bun.write(new URL("./provider-pins.json", import.meta.url), JSON.stringify(snapshot, null, 2) + "\n");
console.log(`Recorded ${ids.length} models; ${Object.values(models).filter((model) => !model.firstPartyAvailable).length} lack an advertised first-party endpoint.`);
