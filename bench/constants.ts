import {
  createOpenRouter,
  type OpenRouterChatSettings,
} from "@openrouter/ai-sdk-provider";
import type { LanguageModel } from "ai";
import effortEvidence from "./effort-levels.json";

// Bun's fetch aborts after 300s without the response headers arriving, and some
// providers stay silent while a model thinks, which failed every Muse Spark run
// longer than 5 minutes. Disable that idle timer; REQUEST_TIMEOUT_MS remains the
// safety net for hung requests.
// `timeout` is a Bun-specific fetch option not present in the DOM types.
const fetchWithoutIdleTimeout = ((input: RequestInfo | URL, init?: RequestInit) =>
  fetch(input, { ...init, timeout: false } as unknown as RequestInit)) as typeof fetch;
const openrouter = createOpenRouter({ fetch: fetchWithoutIdleTimeout });

// Safety net for hung requests only: historical successful runs took up to ~60
// minutes, and a timeout records a failed run that gets retried (and paid) again.
export const REQUEST_TIMEOUT_MS = 3 * 60 * 60 * 1000;
export const MAX_PARALLEL_RUNS_PER_MODEL = 10;

const defaultProviderOptions: OpenRouterChatSettings = {
  usage: {
    include: true,
  },
};

// OpenRouter endpoint tags are verified by refresh-provider-pins.ts. A base
// provider slug includes its normal quantized endpoint variants.
const firstPartyProviders: Record<string, string> = {
  allenai: "allenai", anthropic: "anthropic", "bytedance-seed": "seed",
  deepseek: "deepseek", google: "google-ai-studio", meta: "meta",
  minimax: "minimax", mistralai: "mistral", moonshotai: "moonshotai",
  openai: "openai", qwen: "alibaba", "x-ai": "xai",
  xiaomi: "xiaomi", "z-ai": "z-ai",
};

export function pinnedSettings(id: string, settings: OpenRouterChatSettings = defaultProviderOptions): OpenRouterChatSettings {
  const maker = id.split("/")[0] ?? "";
  const slug = settings.provider?.only?.[0] ?? firstPartyProviders[maker];
  if (!slug) throw new Error(`No first-party provider configured for ${id}`);
  return { ...settings, provider: { order: [slug], allow_fallbacks: false } };
}

function pinnedModel(id: string, settings: OpenRouterChatSettings = defaultProviderOptions) {
  return openrouter(id, pinnedSettings(id, settings));
}

export function pinnedProviderFor(model: Model): string {
  const settings = (model.llm as { settings?: OpenRouterChatSettings }).settings;
  const slug = settings?.provider?.order?.[0];
  if (!slug) throw new Error(`Missing provider pin for ${model.name}`);
  return slug;
}

export function requestProviderOptions(model: Model): { openrouter: { provider: { order: string[]; allow_fallbacks: false; require_parameters?: true } } } {
  return { openrouter: { provider: {
    order: [pinnedProviderFor(model)], allow_fallbacks: false,
    ...(outputModeFor(model) === "json_schema" ? { require_parameters: true as const } : {}),
  } } };
}

export type Model = {
  llm: LanguageModel & { readonly modelId: string };
  name: string;
  family: string;
  effort: string;
  reasoning: boolean;
  // How the answer is requested. "json_schema" (default for new runs) uses
  // strict structured output; "text" is the legacy free-text format, used for
  // models whose first-party endpoints lack schema support or whose answers
  // measurably degrade with schema enforcement.
  outputMode?: OutputMode;
  // Stream the response (transport only) for endpoints that drop requests
  // which stay silent for more than five minutes.
  stream?: boolean;
  // A provider-side cap on request duration; runs cut off there count as
  // unsolved attempts (status "timeout") rather than being retried.
  providerTimeLimit?: { seconds: number; note: string };
};

export type OutputMode = "json_schema" | "text";

// Experiments may force a mode (e.g. the 5x5 A/B check against a scratch DB).
export function outputModeFor(model: Model): OutputMode {
  const override = process.env.NONOBENCH_OUTPUT_MODE;
  if (override === "text" || override === "json_schema") return override;
  return model.outputMode ?? "json_schema";
}

// Meta's API ends Muse Spark requests at about five minutes (no generation in
// OpenRouter's activity log ever exceeded 298s, and cut-off requests were never
// billed or marked cancelled), so longer attempts cannot finish.
const MUSE_TIME_LIMIT = {
  seconds: 300,
  note: "Meta's API ends requests after about 5 minutes, before the model answered",
};

// A reasoning variant at an explicit effort, named "<family>-<effort>".
function reasoningModel(id: string, family: string, effort: string): Model {
  return {
    llm: pinnedModel(id, {
      ...defaultProviderOptions,
      extraBody: { reasoning: { effort, exclude: true } },
    }),
    name: `${family}-${effort}`,
    family,
    effort,
    reasoning: true,
  };
}

// Reasoning on at the provider's default, for models without effort control.
function defaultReasoningModel(id: string, family: string): Model {
  return {
    llm: pinnedModel(id, {
      ...defaultProviderOptions,
      extraBody: { reasoning: { enabled: true, exclude: true } },
    }),
    name: family,
    family,
    effort: "default",
    reasoning: true,
  };
}

const configuredModels: Model[] = ([
  {
    llm: pinnedModel("allenai/olmo-3.1-32b-think", defaultProviderOptions),
    name: "olmo-3.1-32b-think",
    family: "olmo-3.1-32b-think",
    effort: "default",
    reasoning: true,
  },
  {
    llm: pinnedModel("anthropic/claude-opus-4.5", {
      ...defaultProviderOptions,
      extraBody: {
        reasoning: { effort: "low", exclude: true },
      },
    }),
    name: "claude-4.5-opus-low",
    family: "claude-4.5-opus",
    effort: "low",
    reasoning: true,
  },
  {
    llm: pinnedModel("anthropic/claude-opus-4.5", {
      ...defaultProviderOptions,
      extraBody: {
        reasoning: { effort: "high", exclude: true },
      },
    }),
    name: "claude-4.5-opus-high",
    family: "claude-4.5-opus",
    effort: "high",
    reasoning: true,
  },
  {
    llm: pinnedModel("anthropic/claude-sonnet-4.5", {
      ...defaultProviderOptions,
      extraBody: {
        reasoning: { enabled: false, exclude: true },
      },
    }),
    name: "claude-4.5-sonnet-non-reasoning",
    family: "claude-4.5-sonnet",
    effort: "none",
    reasoning: false,
  },
  {
    llm: pinnedModel("anthropic/claude-sonnet-4.5", {
      ...defaultProviderOptions,
      extraBody: {
        reasoning: { enabled: true, exclude: true },
      },
    }),
    name: "claude-4.5-sonnet-reasoning",
    family: "claude-4.5-sonnet",
    effort: "default",
    reasoning: true,
  },
  {
    llm: pinnedModel("bytedance-seed/seed-1.6", {
      ...defaultProviderOptions,
      extraBody: {
        reasoning: { effort: "high", exclude: true },
      },
    }),
    name: "seed-1.6-high",
    family: "seed-1.6",
    effort: "high",
    reasoning: true,
  },
  {
    llm: pinnedModel("bytedance-seed/seed-1.6-flash", {
      ...defaultProviderOptions,
      extraBody: {
        reasoning: { effort: "high", exclude: true },
      },
    }),
    name: "seed-1.6-flash-high",
    family: "seed-1.6-flash",
    effort: "high",
    reasoning: true,
  },
  {
    llm: pinnedModel("deepseek/deepseek-v3.2", defaultProviderOptions),
    name: "deepseek-v3.2",
    family: "deepseek-v3.2",
    effort: "none",
    reasoning: false,
  },
  {
    llm: pinnedModel("deepseek/deepseek-v3.2", {
      ...defaultProviderOptions,
      extraBody: {
        reasoning: { effort: "high", exclude: true },
      },
    }),
    name: "deepseek-v3.2-high",
    family: "deepseek-v3.2",
    effort: "high",
    reasoning: true,
  },
  {
    llm: pinnedModel("deepseek/deepseek-v3.2-speciale", defaultProviderOptions),
    name: "deepseek-v3.2-speciale",
    family: "deepseek-v3.2-speciale",
    effort: "none",
    reasoning: false,
  },
  {
    llm: pinnedModel("deepseek/deepseek-v3.2-speciale", {
      ...defaultProviderOptions,
      extraBody: {
        reasoning: { effort: "high", exclude: true },
      },
    }),
    name: "deepseek-v3.2-speciale-high",
    family: "deepseek-v3.2-speciale",
    effort: "high",
    reasoning: true,
  },
  {
    llm: pinnedModel("google/gemini-3-flash-preview", {
      ...defaultProviderOptions,
      extraBody: { reasoning: { effort: "minimal", exclude: true } },
    }),
    name: "gemini-3-flash-preview-minimal",
    family: "gemini-3-flash-preview",
    effort: "minimal",
    reasoning: true,
  },
  {
    llm: pinnedModel("google/gemini-3-flash-preview", {
      ...defaultProviderOptions,
      extraBody: {
        reasoning: { effort: "high" },
      },
      provider: {
        allow_fallbacks: false,
        only: ["google-vertex"],
      },
    }),
    name: "gemini-3-flash-preview-high",
    family: "gemini-3-flash-preview",
    effort: "high",
    reasoning: true,
  },
  {
    llm: pinnedModel("google/gemini-3-pro-preview", {
      ...defaultProviderOptions,
      extraBody: {
        reasoning: { effort: "low", exclude: true },
      },
    }),
    name: "gemini-3-pro-preview-low",
    family: "gemini-3-pro-preview",
    effort: "low",
    reasoning: true,
  },
  {
    llm: pinnedModel("google/gemini-3-pro-preview", {
      ...defaultProviderOptions,
      extraBody: {
        reasoning: { effort: "high" },
      },
      provider: {
        allow_fallbacks: false,
        only: ["google-vertex"],
      },
    }),
    name: "gemini-3-pro-preview-high",
    family: "gemini-3-pro-preview",
    effort: "high",
    reasoning: true,
  },
  {
    llm: pinnedModel("google/gemini-3.1-pro-preview", {
      ...defaultProviderOptions,
      extraBody: {
        reasoning: { effort: "low", exclude: true },
      },
    }),
    name: "gemini-3.1-pro-preview-low",
    family: "gemini-3.1-pro-preview",
    effort: "low",
    reasoning: true,
  },
  {
    llm: pinnedModel("google/gemini-3.1-pro-preview", {
      ...defaultProviderOptions,
      extraBody: {
        reasoning: { effort: "high" },
      },
      provider: {
        allow_fallbacks: false,
        only: ["google-vertex"],
      },
    }),
    name: "gemini-3.1-pro-preview-high",
    family: "gemini-3.1-pro-preview",
    effort: "high",
    reasoning: true,
  },
  {
    llm: pinnedModel("minimax/minimax-m2.1", defaultProviderOptions),
    name: "minimax-m2.1",
    family: "minimax-m2.1",
    effort: "default",
    reasoning: true,
  },
  {
    llm: pinnedModel("minimax/minimax-m2.1", {
      ...defaultProviderOptions,
      extraBody: {
        reasoning: { effort: "high", exclude: true },
      },
    }),
    name: "minimax-m2.1-high",
    family: "minimax-m2.1",
    effort: "high",
    reasoning: true,
  },
  {
    llm: pinnedModel("minimax/minimax-m2.5", defaultProviderOptions),
    name: "minimax-m2.5",
    family: "minimax-m2.5",
    effort: "default",
    reasoning: true,
  },
  {
    llm: pinnedModel("minimax/minimax-m2.5", {
      ...defaultProviderOptions,
      extraBody: {
        reasoning: { effort: "high", exclude: true },
      },
    }),
    name: "minimax-m2.5-high",
    family: "minimax-m2.5",
    effort: "high",
    reasoning: true,
  },
  {
    llm: pinnedModel("mistralai/ministral-14b-2512", defaultProviderOptions),
    name: "ministral-14b-2512",
    family: "ministral-14b-2512",
    effort: "none",
    reasoning: false,
  },
  {
    llm: pinnedModel("mistralai/mistral-large-2512", defaultProviderOptions),
    name: "mistral-large-2512",
    family: "mistral-large-2512",
    effort: "none",
    reasoning: false,
  },
  {
    llm: pinnedModel("moonshotai/kimi-k2-0905", defaultProviderOptions),
    name: "kimi-k2",
    family: "kimi-k2",
    effort: "none",
    reasoning: false,
  },
  {
    llm: pinnedModel("moonshotai/kimi-k2-thinking", defaultProviderOptions),
    name: "kimi-k2-thinking",
    family: "kimi-k2-thinking",
    effort: "default",
    reasoning: true,
  },
  {
    llm: pinnedModel("moonshotai/kimi-k2.5", {
      ...defaultProviderOptions,
      extraBody: {
        reasoning: { enabled: false, exclude: true },
      },
    }),
    name: "kimi-k2.5-non-reasoning",
    family: "kimi-k2.5",
    effort: "none",
    reasoning: false,
  },
  {
    llm: pinnedModel("moonshotai/kimi-k2.5", {
      ...defaultProviderOptions,
      extraBody: {
        reasoning: { effort: "high", exclude: true },
      },
    }),
    name: "kimi-k2.5-high",
    family: "kimi-k2.5",
    effort: "high",
    reasoning: true,
  },
  {
    llm: pinnedModel("openai/gpt-5.2", {
      ...defaultProviderOptions,
      extraBody: {
        reasoning: {
          effort: "low",
          exclude: true,
        },
      },
    }),
    name: "gpt-5.2-low",
    family: "gpt-5.2",
    effort: "low",
    reasoning: true,
  },
  {
    llm: pinnedModel("openai/gpt-5.2", {
      ...defaultProviderOptions,
      extraBody: {
        reasoning: {
          effort: "high",
          exclude: true,
        },
      },
    }),
    name: "gpt-5.2-high",
    family: "gpt-5.2",
    effort: "high",
    reasoning: true,
  },
  {
    llm: pinnedModel("openai/gpt-5.2", {
      ...defaultProviderOptions,
      extraBody: {
        reasoning: {
          effort: "xhigh",
          exclude: true,
        },
      },
    }),
    name: "gpt-5.2-xhigh",
    family: "gpt-5.2",
    effort: "xhigh",
    reasoning: true,
  },
  // {
  // 	llm: pinnedModel("openai/gpt-5.2-pro", defaultProviderOptions),
  // 	name: "gpt-5.2-pro",
  // 	family: "gpt-5.2-pro",
  // 	effort: "default",
  // 	reasoning: true,
  // },
  // {
  // 	name: "gpt-5.2-pro-high",
  // 	family: "gpt-5.2-pro",
  // 	effort: "high",
  // 	reasoning: true,
  // 	llm: pinnedModel("openai/gpt-5.2-pro", {
  // 		...defaultProviderOptions,
  // 		reasoning: {
  // 			effort: "high",
  // 			exclude: true,
  // 		},
  // 	}),
  // },
  {
    llm: pinnedModel("openai/gpt-5.4", {
      ...defaultProviderOptions,
      extraBody: {
        reasoning: {
          effort: "low",
          exclude: true,
        },
      },
    }),
    name: "gpt-5.4-low",
    family: "gpt-5.4",
    effort: "low",
    reasoning: true,
  },
  {
    llm: pinnedModel("openai/gpt-5.4", {
      ...defaultProviderOptions,
      extraBody: {
        reasoning: {
          effort: "high",
          exclude: true,
        },
      },
    }),
    name: "gpt-5.4-high",
    family: "gpt-5.4",
    effort: "high",
    reasoning: true,
  },
  {
    llm: pinnedModel("openai/gpt-5.4", {
      ...defaultProviderOptions,
      extraBody: {
        reasoning: {
          effort: "xhigh",
          exclude: true,
        },
      },
    }),
    name: "gpt-5.4-xhigh",
    family: "gpt-5.4",
    effort: "xhigh",
    reasoning: true,
  },
  {
    llm: pinnedModel("openai/gpt-oss-120b", {
      ...defaultProviderOptions,
      extraBody: { reasoning: { effort: "low", exclude: true } },
    }),
    name: "gpt-oss-120b-low",
    family: "gpt-oss-120b",
    effort: "low",
    reasoning: true,
  },
  {
    llm: pinnedModel("openai/gpt-oss-120b", {
      ...defaultProviderOptions,
      extraBody: {
        reasoning: { effort: "high", exclude: true },
      },
    }),
    name: "gpt-oss-120b-high",
    family: "gpt-oss-120b",
    effort: "high",
    reasoning: true,
  },
  {
    llm: pinnedModel("qwen/qwen3-next-80b-a3b-thinking", defaultProviderOptions),
    name: "qwen3-next-80b-a3b-thinking",
    family: "qwen3-next-80b-a3b-thinking",
    effort: "default",
    reasoning: true,
  },
  {
    llm: pinnedModel("z-ai/glm-4.7", {
      ...defaultProviderOptions,
      extraBody: { reasoning: { enabled: false, exclude: true } },
    }),
    name: "glm-4.7-non-reasoning",
    family: "glm-4.7",
    effort: "none",
    reasoning: false,
  },
  {
    llm: pinnedModel("z-ai/glm-4.7", defaultProviderOptions),
    name: "glm-4.7-reasoning",
    family: "glm-4.7",
    effort: "default",
    reasoning: true,
  },
  {
    llm: pinnedModel("z-ai/glm-4.7", {
      ...defaultProviderOptions,
      extraBody: {
        reasoning: { effort: "high", exclude: true },
      },
    }),
    name: "glm-4.7-reasoning-high",
    family: "glm-4.7",
    effort: "high",
    reasoning: true,
  },
  {
    llm: pinnedModel("z-ai/glm-5", {
      ...defaultProviderOptions,
      extraBody: { reasoning: { enabled: false, exclude: true } },
    }),
    name: "glm-5-non-reasoning",
    family: "glm-5",
    effort: "none",
    reasoning: false,
  },
  {
    llm: pinnedModel("z-ai/glm-5", defaultProviderOptions),
    name: "glm-5-reasoning",
    family: "glm-5",
    effort: "default",
    reasoning: true,
  },
  {
    llm: pinnedModel("z-ai/glm-5", {
      ...defaultProviderOptions,
      extraBody: {
        reasoning: { effort: "high", exclude: true },
      },
    }),
    name: "glm-5-reasoning-high",
    family: "glm-5",
    effort: "high",
    reasoning: true,
  },
  {
    llm: pinnedModel("x-ai/grok-4", defaultProviderOptions),
    name: "grok-4",
    family: "grok-4",
    effort: "default",
    reasoning: true,
  },
  {
    llm: pinnedModel("x-ai/grok-4.1-fast", {
      ...defaultProviderOptions,
      extraBody: { reasoning: { enabled: false } },
    }),
    name: "grok-4.1-fast-non-reasoning",
    family: "grok-4.1-fast",
    effort: "none",
    reasoning: false,
  },
  {
    llm: pinnedModel("x-ai/grok-4.1-fast", defaultProviderOptions),
    name: "grok-4.1-fast-reasoning",
    family: "grok-4.1-fast",
    effort: "default",
    reasoning: true,
  },
  {
    llm: pinnedModel("x-ai/grok-4.1-fast", {
      ...defaultProviderOptions,
      extraBody: {
        reasoning: { effort: "high", exclude: true },
      },
    }),
    name: "grok-4.1-fast-reasoning-high",
    family: "grok-4.1-fast",
    effort: "high",
    reasoning: true,
  },
  {
    llm: pinnedModel("xiaomi/mimo-v2-flash:free", {
      ...defaultProviderOptions,
      extraBody: { reasoning: { enabled: false } },
    }),
    name: "mimo-v2-flash",
    family: "mimo-v2-flash",
    effort: "none",
    reasoning: false,
  },
  {
    llm: pinnedModel("xiaomi/mimo-v2-flash:free", {
      ...defaultProviderOptions,
      extraBody: {
        reasoning: { effort: "high", exclude: true },
      },
    }),
    name: "mimo-v2-flash-high",
    family: "mimo-v2-flash",
    effort: "high",
    reasoning: true,
  },

  // --- September 2026 batch: strict structured output, effort ladder ---
  // Each family starts at its lowest effort and steps up while it pays off.
  // outputMode "text": a 5x5 A/B (same prompt, 10 puzzles) showed structured
  // output costing these models 3+ puzzles (Qwen 3.8 Max 0 vs 10, Qwen 3.8
  // Flash 2 vs 10, Mistral Medium 3.5 6 vs 9, Claude Fable 5.1 6 vs 9).
  reasoningModel("anthropic/claude-opus-5.5", "claude-opus-5.5", "low"),
  { ...reasoningModel("anthropic/claude-fable-5.1", "claude-fable-5.1", "low"), outputMode: "text" },
  reasoningModel("openai/gpt-6-sol", "gpt-6-sol", "low"),
  reasoningModel("openai/gpt-6-luna", "gpt-6-luna", "low"),
  reasoningModel("openai/gpt-6-astra", "gpt-6-astra", "low"),
  reasoningModel("google/gemini-3.8-flash", "gemini-3.8-flash", "low"),
  reasoningModel("x-ai/grok-4.7", "grok-4.7", "low"),
  { ...reasoningModel("deepseek/deepseek-v4-pro-0813", "deepseek-v4-pro", "low"), outputMode: "text" },
  { ...reasoningModel("deepseek/deepseek-v4.1-flash", "deepseek-v4.1-flash", "low"), outputMode: "text" },
  { ...reasoningModel("qwen/qwen3.8-max-0902", "qwen3.8-max", "low"), outputMode: "text" },
  { ...reasoningModel("z-ai/glm-5.3", "glm-5.3", "low"), outputMode: "text" },
  { ...reasoningModel("z-ai/glm-5.3-flash", "glm-5.3-flash", "low"), outputMode: "text" },
  reasoningModel("moonshotai/kimi-k3", "kimi-k3", "low"),
  { ...reasoningModel("meta/muse-spark-1.3", "muse-spark-1.3", "low"), outputMode: "text", stream: true, providerTimeLimit: MUSE_TIME_LIMIT },
  { ...reasoningModel("mistralai/mistral-medium-3-5", "mistral-medium-3.5", "low"), outputMode: "text" },
  // Muse Spark: Meta caps non-streaming requests at ~5 minutes (504; streaming
  // is exempt per its docs), and schema-constrained responses still hit the
  // cap through OpenRouter, so it streams in text mode. Its 5x5 A/B showed no
  // format effect (10/10 either way).
  // Effort ladder, step 1: the cheapest promising models at medium effort.
  { ...reasoningModel("deepseek/deepseek-v4.1-flash", "deepseek-v4.1-flash", "medium"), outputMode: "text" },
  reasoningModel("google/gemini-3.8-flash", "gemini-3.8-flash", "medium"),
  reasoningModel("openai/gpt-6-sol", "gpt-6-sol", "medium"),
  { ...reasoningModel("meta/muse-spark-1.3", "muse-spark-1.3", "medium"), outputMode: "text", stream: true, providerTimeLimit: MUSE_TIME_LIMIT },
  { ...reasoningModel("deepseek/deepseek-v4-pro-0813", "deepseek-v4-pro", "medium"), outputMode: "text" },
  // Effort ladder, step 2: step 1 gained 2+ puzzles (Sol 17 to 21, Gemini
  // 3.8 Flash 11 to 20), plus a first step for the pricier leaders.
  reasoningModel("openai/gpt-6-sol", "gpt-6-sol", "high"),
  reasoningModel("google/gemini-3.8-flash", "gemini-3.8-flash", "high"),
  reasoningModel("moonshotai/kimi-k3", "kimi-k3", "medium"),
  reasoningModel("x-ai/grok-4.7", "grok-4.7", "medium"),
  reasoningModel("openai/gpt-6-astra", "gpt-6-astra", "medium"),
  // Effort ladder, step 3: Sol gained 5 at high; Opus gets its first step.
  reasoningModel("openai/gpt-6-sol", "gpt-6-sol", "xhigh"),
  reasoningModel("anthropic/claude-opus-5.5", "claude-opus-5.5", "medium"),
  // Step 4: Opus gained 9 at medium (18 to 27); Sol lost 2 at xhigh and stops.
  reasoningModel("anthropic/claude-opus-5.5", "claude-opus-5.5", "high"),
  // No effort control on OpenRouter: reasoning on at the provider default.
  { ...defaultReasoningModel("qwen/qwen3.8-flash", "qwen3.8-flash"), outputMode: "text" },
  defaultReasoningModel("xiaomi/mimo-v2.6-pro", "mimo-v2.6-pro"),
  defaultReasoningModel("xiaomi/mimo-v2.6-flash", "mimo-v2.6-flash"),
  defaultReasoningModel("bytedance-seed/seed-2-1-turbo", "seed-2.1-turbo"),
  // minimax/minimax-m3 is left out: every endpoint that enforces the schema
  // (Together, CoreWeave) drops reasoning, so it cannot be measured fairly.
// These makers' advertised first-party endpoints do not support structured
// outputs; text mode avoids require_parameters excluding the only legal route.
] as Model[]).map((model) => model.llm.modelId.startsWith("deepseek/") || model.llm.modelId.startsWith("z-ai/")
  || model.llm.modelId.startsWith("minimax/") || model.llm.modelId === "qwen/qwen3-next-80b-a3b-thinking"
  ? { ...model, outputMode: "text" as const }
  : model);

const effortFamilies = effortEvidence.families as Record<string, { modelId: string; levels: string[] }>;
const configuredNames = new Set(configuredModels.map((model) => model.name));
const addedModels: Model[] = [];
for (const [family, evidence] of Object.entries(effortFamilies)) {
  const representative = configuredModels.find((model) => model.family === family && model.llm.modelId === evidence.modelId);
  if (!representative) throw new Error(`No configured model for effort evidence: ${family}`);
  const settings = (representative.llm as { settings?: OpenRouterChatSettings }).settings;
  if (!settings) throw new Error(`Missing provider settings for ${family}`);
  for (const effort of evidence.levels) {
    const name = `${family}-${effort}`;
    if (configuredNames.has(name)) continue;
    addedModels.push({
      ...representative,
      llm: pinnedModel(evidence.modelId, {
        ...settings,
        extraBody: { ...settings.extraBody, reasoning: { effort, exclude: true } },
      }),
      name,
      effort,
      reasoning: true,
    });
    configuredNames.add(name);
  }
}
export const NEW_VARIANT_NAMES = new Set(addedModels.map((model) => model.name));
export const MODELS: Model[] = [...configuredModels, ...addedModels];
