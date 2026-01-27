import {
  openrouter,
  type OpenRouterCompletionSettings,
} from "@openrouter/ai-sdk-provider";
import type { LanguageModel } from "ai";

export const RERUN_THRESHOLD_DAYS = 90;
export const MAX_PARALLEL_RUNS_PER_MODEL = 10;

const defaultProviderOptions: OpenRouterCompletionSettings = {
  usage: {
    include: true,
  },
};

export type Model = {
  llm: LanguageModel;
  name: string;
  reasoning: boolean;
};

export const MODELS: Model[] = [
  {
    llm: openrouter("allenai/olmo-3.1-32b-think", defaultProviderOptions),
    name: "olmo-3.1-32b-think",
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
    reasoning: true,
  },
  {
    llm: openrouter("deepseek/deepseek-v3.2", defaultProviderOptions),
    name: "deepseek-v3.2",
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
    reasoning: true,
  },
  {
    llm: openrouter("deepseek/deepseek-v3.2-speciale", defaultProviderOptions),
    name: "deepseek-v3.2-speciale",
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
    reasoning: true,
  },
  {
    llm: openrouter("google/gemini-3-flash-preview", {
      ...defaultProviderOptions,
      extraBody: { reasoning: { effort: "minimal", exclude: true } },
    }),
    name: "gemini-3-flash-preview-minimal",
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
    reasoning: true,
  },
  {
    llm: openrouter("minimax/minimax-m2.1", defaultProviderOptions),
    name: "minimax-m2.1",
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
    reasoning: true,
  },
  {
    llm: openrouter("mistralai/ministral-14b-2512", defaultProviderOptions),
    name: "ministral-14b-2512",
    reasoning: false,
  },
  {
    llm: openrouter("mistralai/mistral-large-2512", defaultProviderOptions),
    name: "mistral-large-2512",
    reasoning: false,
  },
  {
    llm: openrouter("moonshotai/kimi-k2-0905", defaultProviderOptions),
    name: "kimi-k2",
    reasoning: false,
  },
  {
    llm: openrouter("moonshotai/kimi-k2-thinking", defaultProviderOptions),
    name: "kimi-k2-thinking",
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
    reasoning: true,
  },
  // {
  // 	llm: openrouter("openai/gpt-5.2-pro", defaultProviderOptions),
  // 	name: "gpt-5.2-pro",
  // },
  // {
  // 	name: "gpt-5.2-pro-high",
  // 	llm: openrouter("openai/gpt-5.2-pro", {
  // 		...defaultProviderOptions,
  // 		reasoning: {
  // 			effort: "high",
  // 			exclude: true,
  // 		},
  // 	}),
  // },
  {
    llm: openrouter("openai/gpt-oss-120b", {
      ...defaultProviderOptions,
      extraBody: { reasoning: { effort: "low", exclude: true } },
    }),
    name: "gpt-oss-120b-low",
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
    reasoning: true,
  },
  {
    llm: openrouter("qwen/qwen3-next-80b-a3b-thinking", defaultProviderOptions),
    name: "qwen3-next-80b-a3b-thinking",
    reasoning: true,
  },
  {
    llm: openrouter("z-ai/glm-4.7", {
      ...defaultProviderOptions,
      extraBody: { reasoning: { enabled: false, exclude: true } },
    }),
    name: "glm-4.7-non-reasoning",
    reasoning: false,
  },
  {
    llm: openrouter("z-ai/glm-4.7", defaultProviderOptions),
    name: "glm-4.7-reasoning",
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
    reasoning: true,
  },
  {
    llm: openrouter("x-ai/grok-4", defaultProviderOptions),
    name: "grok-4",
    reasoning: true,
  },
  {
    llm: openrouter("x-ai/grok-4.1-fast", {
      ...defaultProviderOptions,
      extraBody: { reasoning: { enabled: false } },
    }),
    name: "grok-4.1-fast-non-reasoning",
    reasoning: false,
  },
  {
    llm: openrouter("x-ai/grok-4.1-fast", defaultProviderOptions),
    name: "grok-4.1-fast-reasoning",
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
    reasoning: true,
  },
  {
    llm: openrouter("xiaomi/mimo-v2-flash:free", {
      ...defaultProviderOptions,
      extraBody: { reasoning: { enabled: false } },
    }),
    name: "mimo-v2-flash",
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
    reasoning: true,
  },
];
