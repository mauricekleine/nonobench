// Public, unauthenticated catalog only. This prepares configs; it never calls a model.
const modelIds = [
  "anthropic/claude-opus-5.5", "anthropic/claude-fable-5.1",
  "openai/gpt-6-sol", "openai/gpt-6-luna", "openai/gpt-6-astra",
  "google/gemini-3.8-flash", "x-ai/grok-4.7",
  "deepseek/deepseek-v4-pro-0813", "deepseek/deepseek-v4.1-flash",
  "qwen/qwen3.8-max-0902", "z-ai/glm-5.3", "z-ai/glm-5.3-flash",
  "moonshotai/kimi-k3", "meta/muse-spark-1.3", "mistralai/mistral-medium-3-5",
  "qwen/qwen3.8-flash", "xiaomi/mimo-v2.6-pro", "xiaomi/mimo-v2.6-flash",
  "bytedance-seed/seed-2-1-turbo",
] as const;

type CatalogModel = {
  id: string;
  reasoning?: {
    supported_efforts?: string[] | null;
    default_effort?: string;
    mandatory?: boolean;
    supports_max_tokens?: boolean;
  };
};
const source = "https://openrouter.ai/api/v1/models";
const response = await fetch(source);
if (!response.ok) throw new Error(`OpenRouter catalog returned HTTP ${response.status}`);
const catalog = (await response.json()) as { data: CatalogModel[] };
const byId = new Map(catalog.data.map((model) => [model.id, model]));
const families: Record<string, unknown> = {};
for (const modelId of modelIds) {
  const model = byId.get(modelId);
  if (!model) throw new Error(`Missing catalog model ${modelId}`);
  const family = modelId.split("/")[1]!
    .replace("deepseek-v4-pro-0813", "deepseek-v4-pro")
    .replace("qwen3.8-max-0902", "qwen3.8-max")
    .replace("mistral-medium-3-5", "mistral-medium-3.5")
    .replace("seed-2-1-turbo", "seed-2.1-turbo");
  const reasoning = model.reasoning;
  const supported = reasoning?.supported_efforts;
  const effortControl = Array.isArray(supported) && supported.some((level) => level !== "none") &&
    !(supported.length === 2 && supported.includes("high") && supported.includes("none"));
  const cap = family === "claude-fable-5.1" ? "high" : null;
  const order = ["minimal", "low", "medium", "high", "xhigh", "max"];
  const levels = effortControl ? order.filter((level) => supported!.includes(level) && (!cap || order.indexOf(level) <= order.indexOf(cap))) : [];
  families[family] = {
    modelId,
    supportedEfforts: supported ?? null,
    defaultEffort: reasoning?.default_effort ?? null,
    mandatory: reasoning?.mandatory ?? null,
    supportsMaxTokens: reasoning?.supports_max_tokens ?? false,
    levels,
    ...(cap ? { cap, capReason: "Benchmark exception: Claude Fable 5.1 stops at high" } : {}),
  };
}
await Bun.write(new URL("./effort-levels.json", import.meta.url), JSON.stringify({ source, fetchedAt: new Date().toISOString(), families }, null, 2) + "\n");
console.log(`Recorded effort evidence for ${Object.keys(families).length} current families.`);
