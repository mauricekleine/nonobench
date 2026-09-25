import { expect, test } from "bun:test";
import { POST } from "./route";

test("REST comparison resolves family names through the shared resolver", async () => {
  const response = await POST(
    new Request("https://example.test/api/v1/compare", {
      method: "POST",
      body: JSON.stringify({
        models: ["Claude Sonnet 4.5", "GLM 5", "Kimi K2.5", "DeepSeek V3.2"],
      }),
    }),
  );
  expect(response.status).toBe(200);
  expect(
    (await response.json()).models.map(
      (model: { model: string }) => model.model,
    ),
  ).toEqual([
    "claude-4.5-sonnet-reasoning",
    "glm-5-reasoning-high",
    "kimi-k2.5-high",
    "deepseek-v3.2-high",
  ]);
});

test("REST comparison rejects unknown models", async () => {
  const response = await POST(
    new Request("https://example.test/api/v1/compare", {
      method: "POST",
      body: JSON.stringify({ models: ["Claude Sonnet 4.5", "not-a-model"] }),
    }),
  );
  expect(response.status).toBe(400);
});
