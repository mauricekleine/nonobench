import { expect, test } from "bun:test";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { MODELS, outputModeFor, pinnedProviderFor, pinnedSettings, requestProviderOptions } from "./constants";
import snapshot from "./provider-pins.json";

test("every configured model has a first-party pin and DeepSeek/GLM use text", () => {
  for (const model of MODELS) {
    expect(pinnedProviderFor(model)).toBeTruthy();
    if (/^(deepseek|z-ai)\//.test(model.llm.modelId)) expect(outputModeFor(model)).toBe("text");
    const endpoint = (snapshot.models as Record<string, { firstPartyStructuredOutputs: boolean | null }>)[model.llm.modelId];
    if (endpoint?.firstPartyStructuredOutputs === false) expect(outputModeFor(model)).toBe("text");
  }
});

test.each(["deepseek-v4-pro-low", "gpt-6-sol-low"])("outbound %s request contains the pin", async (name) => {
  const model = MODELS.find((item) => item.name === name)!;
  let body: Record<string, any> | undefined;
  const provider = createOpenRouter({
    apiKey: "test-key",
    fetch: (async (_input, init) => {
      body = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ error: { message: "intercepted" } }), { status: 400, headers: { "content-type": "application/json" } });
    }) as typeof fetch,
  });
  try {
    await generateText({
      model: provider.chat(model.llm.modelId, pinnedSettings(model.llm.modelId)),
      prompt: "intercepted before inference",
      providerOptions: requestProviderOptions(model),
    });
  } catch {
    // The fake endpoint deliberately returns an error after recording the body.
  }
  expect(body?.provider).toEqual({
    order: [pinnedProviderFor(model)],
    allow_fallbacks: false,
    ...(outputModeFor(model) === "json_schema" ? { require_parameters: true } : {}),
  });
});
