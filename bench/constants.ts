import {
  openrouter,
  type OpenRouterCompletionSettings,
} from "@openrouter/ai-sdk-provider";
import type { LanguageModel } from "ai";

// Safety net for hung requests only: historical successful runs took up to ~60
// minutes, and a timeout records a failed run that gets retried (and paid) again.
export const REQUEST_TIMEOUT_MS = 3 * 60 * 60 * 1000;
export const MAX_PARALLEL_RUNS_PER_MODEL = 10;

const defaultProviderOptions: OpenRouterCompletionSettings = {
  usage: {
    include: true,
  },
};

export type Model = {
  llm: LanguageModel & { readonly modelId: string };
  name: string;
  family: string;
  effort: string;
  reasoning: boolean;
  // How the answer is requested. "json_schema" (default for new runs) uses
  // strict structured output; "text" is the legacy free-text format, used for
  // models whose schema-enforcing endpoints measurably degrade answers.
  outputMode?: OutputMode;
};

export type OutputMode = "json_schema" | "text";

// Experiments may force a mode (e.g. the 5x5 A/B check against a scratch DB).
export function outputModeFor(model: Model): OutputMode {
  const override = process.env.NONOBENCH_OUTPUT_MODE;
  if (override === "text" || override === "json_schema") return override;
  return model.outputMode ?? "json_schema";
}

// A reasoning variant at an explicit effort, named "<family>-<effort>".
function reasoningModel(id: string, family: string, effort: string): Model {
  return {
    llm: openrouter(id, {
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
    llm: openrouter(id, {
      ...defaultProviderOptions,
      extraBody: { reasoning: { enabled: true, exclude: true } },
    }),
    name: family,
    family,
    effort: "default",
    reasoning: true,
  };
}

export const MODELS: Model[] = [
  {
    llm: openrouter("allenai/olmo-3.1-32b-think", defaultProviderOptions),
    name: "olmo-3.1-32b-think",
    family: "olmo-3.1-32b-think",
    effort: "default",
    reasoning: true,
  },
  {
    llm: openrouter("anthropic/claude-opus-4.5", {
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
    llm: openrouter("anthropic/claude-opus-4.5", {
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
    llm: openrouter("anthropic/claude-sonnet-4.5", {
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
    llm: openrouter("anthropic/claude-sonnet-4.5", {
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
    llm: openrouter("bytedance-seed/seed-1.6", {
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
    llm: openrouter("bytedance-seed/seed-1.6-flash", {
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
    llm: openrouter("deepseek/deepseek-v3.2", defaultProviderOptions),
    name: "deepseek-v3.2",
    family: "deepseek-v3.2",
    effort: "none",
    reasoning: false,
  },
  {
    llm: openrouter("deepseek/deepseek-v3.2", {
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
    llm: openrouter("deepseek/deepseek-v3.2-speciale", defaultProviderOptions),
    name: "deepseek-v3.2-speciale",
    family: "deepseek-v3.2-speciale",
    effort: "none",
    reasoning: false,
  },
  {
    llm: openrouter("deepseek/deepseek-v3.2-speciale", {
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
    llm: openrouter("google/gemini-3-flash-preview", {
      ...defaultProviderOptions,
      extraBody: { reasoning: { effort: "minimal", exclude: true } },
    }),
    name: "gemini-3-flash-preview-minimal",
    family: "gemini-3-flash-preview",
    effort: "minimal",
    reasoning: true,
  },
  {
    llm: openrouter("google/gemini-3-flash-preview", {
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
    llm: openrouter("google/gemini-3-pro-preview", {
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
    llm: openrouter("google/gemini-3-pro-preview", {
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
    llm: openrouter("google/gemini-3.1-pro-preview", {
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
    llm: openrouter("google/gemini-3.1-pro-preview", {
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
    llm: openrouter("minimax/minimax-m2.1", defaultProviderOptions),
    name: "minimax-m2.1",
    family: "minimax-m2.1",
    effort: "default",
    reasoning: true,
  },
  {
    llm: openrouter("minimax/minimax-m2.1", {
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
    llm: openrouter("minimax/minimax-m2.5", defaultProviderOptions),
    name: "minimax-m2.5",
    family: "minimax-m2.5",
    effort: "default",
    reasoning: true,
  },
  {
    llm: openrouter("minimax/minimax-m2.5", {
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
    llm: openrouter("mistralai/ministral-14b-2512", defaultProviderOptions),
    name: "ministral-14b-2512",
    family: "ministral-14b-2512",
    effort: "none",
    reasoning: false,
  },
  {
    llm: openrouter("mistralai/mistral-large-2512", defaultProviderOptions),
    name: "mistral-large-2512",
    family: "mistral-large-2512",
    effort: "none",
    reasoning: false,
  },
  {
    llm: openrouter("moonshotai/kimi-k2-0905", defaultProviderOptions),
    name: "kimi-k2",
    family: "kimi-k2",
    effort: "none",
    reasoning: false,
  },
  {
    llm: openrouter("moonshotai/kimi-k2-thinking", defaultProviderOptions),
    name: "kimi-k2-thinking",
    family: "kimi-k2-thinking",
    effort: "default",
    reasoning: true,
  },
  {
    llm: openrouter("moonshotai/kimi-k2.5", {
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
    llm: openrouter("moonshotai/kimi-k2.5", {
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
    llm: openrouter("openai/gpt-5.2", {
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
    llm: openrouter("openai/gpt-5.2", {
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
    llm: openrouter("openai/gpt-5.2", {
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
  // 	llm: openrouter("openai/gpt-5.2-pro", defaultProviderOptions),
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
  // 	llm: openrouter("openai/gpt-5.2-pro", {
  // 		...defaultProviderOptions,
  // 		reasoning: {
  // 			effort: "high",
  // 			exclude: true,
  // 		},
  // 	}),
  // },
  {
    llm: openrouter("openai/gpt-5.4", {
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
    llm: openrouter("openai/gpt-5.4", {
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
    llm: openrouter("openai/gpt-5.4", {
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
    llm: openrouter("openai/gpt-oss-120b", {
      ...defaultProviderOptions,
      extraBody: { reasoning: { effort: "low", exclude: true } },
    }),
    name: "gpt-oss-120b-low",
    family: "gpt-oss-120b",
    effort: "low",
    reasoning: true,
  },
  {
    llm: openrouter("openai/gpt-oss-120b", {
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
    llm: openrouter("qwen/qwen3-next-80b-a3b-thinking", defaultProviderOptions),
    name: "qwen3-next-80b-a3b-thinking",
    family: "qwen3-next-80b-a3b-thinking",
    effort: "default",
    reasoning: true,
  },
  {
    llm: openrouter("z-ai/glm-4.7", {
      ...defaultProviderOptions,
      extraBody: { reasoning: { enabled: false, exclude: true } },
    }),
    name: "glm-4.7-non-reasoning",
    family: "glm-4.7",
    effort: "none",
    reasoning: false,
  },
  {
    llm: openrouter("z-ai/glm-4.7", defaultProviderOptions),
    name: "glm-4.7-reasoning",
    family: "glm-4.7",
    effort: "default",
    reasoning: true,
  },
  {
    llm: openrouter("z-ai/glm-4.7", {
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
    llm: openrouter("z-ai/glm-5", {
      ...defaultProviderOptions,
      extraBody: { reasoning: { enabled: false, exclude: true } },
    }),
    name: "glm-5-non-reasoning",
    family: "glm-5",
    effort: "none",
    reasoning: false,
  },
  {
    llm: openrouter("z-ai/glm-5", defaultProviderOptions),
    name: "glm-5-reasoning",
    family: "glm-5",
    effort: "default",
    reasoning: true,
  },
  {
    llm: openrouter("z-ai/glm-5", {
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
    llm: openrouter("x-ai/grok-4", defaultProviderOptions),
    name: "grok-4",
    family: "grok-4",
    effort: "default",
    reasoning: true,
  },
  {
    llm: openrouter("x-ai/grok-4.1-fast", {
      ...defaultProviderOptions,
      extraBody: { reasoning: { enabled: false } },
    }),
    name: "grok-4.1-fast-non-reasoning",
    family: "grok-4.1-fast",
    effort: "none",
    reasoning: false,
  },
  {
    llm: openrouter("x-ai/grok-4.1-fast", defaultProviderOptions),
    name: "grok-4.1-fast-reasoning",
    family: "grok-4.1-fast",
    effort: "default",
    reasoning: true,
  },
  {
    llm: openrouter("x-ai/grok-4.1-fast", {
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
    llm: openrouter("xiaomi/mimo-v2-flash:free", {
      ...defaultProviderOptions,
      extraBody: { reasoning: { enabled: false } },
    }),
    name: "mimo-v2-flash",
    family: "mimo-v2-flash",
    effort: "none",
    reasoning: false,
  },
  {
    llm: openrouter("xiaomi/mimo-v2-flash:free", {
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
  reasoningModel("deepseek/deepseek-v4-pro-0813", "deepseek-v4-pro", "low"),
  reasoningModel("deepseek/deepseek-v4.1-flash", "deepseek-v4.1-flash", "low"),
  { ...reasoningModel("qwen/qwen3.8-max-0902", "qwen3.8-max", "low"), outputMode: "text" },
  reasoningModel("z-ai/glm-5.3", "glm-5.3", "low"),
  reasoningModel("z-ai/glm-5.3-flash", "glm-5.3-flash", "low"),
  reasoningModel("moonshotai/kimi-k3", "kimi-k3", "low"),
  reasoningModel("meta/muse-spark-1.3", "muse-spark-1.3", "low"),
  { ...reasoningModel("mistralai/mistral-medium-3-5", "mistral-medium-3.5", "low"), outputMode: "text" },
  // Effort ladder, step 1: the cheapest promising models at medium effort.
  reasoningModel("deepseek/deepseek-v4.1-flash", "deepseek-v4.1-flash", "medium"),
  reasoningModel("google/gemini-3.8-flash", "gemini-3.8-flash", "medium"),
  reasoningModel("openai/gpt-6-sol", "gpt-6-sol", "medium"),
  reasoningModel("meta/muse-spark-1.3", "muse-spark-1.3", "medium"),
  reasoningModel("deepseek/deepseek-v4-pro-0813", "deepseek-v4-pro", "medium"),
  // No effort control on OpenRouter: reasoning on at the provider default.
  { ...defaultReasoningModel("qwen/qwen3.8-flash", "qwen3.8-flash"), outputMode: "text" },
  defaultReasoningModel("xiaomi/mimo-v2.6-pro", "mimo-v2.6-pro"),
  defaultReasoningModel("xiaomi/mimo-v2.6-flash", "mimo-v2.6-flash"),
  defaultReasoningModel("bytedance-seed/seed-2-1-turbo", "seed-2.1-turbo"),
  // minimax/minimax-m3 is left out: every endpoint that enforces the schema
  // (Together, CoreWeave) drops reasoning, so it cannot be measured fairly.
];
