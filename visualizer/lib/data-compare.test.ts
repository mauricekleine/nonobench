import { expect, test } from "bun:test";
import { compareModels } from "./data";

test("comparison resolves variant ids and display family names", () => {
  const [variant, family] = compareModels([
    "gpt-6-astra-medium",
    "Claude Opus 5.5",
  ]);
  expect(variant?.model).toBe("gpt-6-astra-medium");
  expect(family?.family).toBe("claude-opus-5.5");
  expect(family?.bySize.length).toBeGreaterThan(0);
});

test("family display names select best, while exact variant ids remain exact", () => {
  const names = ["Claude Sonnet 4.5", "GLM 5", "Kimi K2.5", "DeepSeek V3.2"];
  expect(compareModels(names).map((model) => model?.model)).toEqual([
    "claude-4.5-sonnet-reasoning",
    "glm-5-reasoning-high",
    "kimi-k2.5-high",
    "deepseek-v3.2-high",
  ]);
  expect(
    compareModels(["deepseek-v3.2", "claude-4.5-sonnet-non-reasoning"]).map(
      (model) => model?.model,
    ),
  ).toEqual(["deepseek-v3.2", "claude-4.5-sonnet-non-reasoning"]);
});
