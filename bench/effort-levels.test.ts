import { expect, test } from "bun:test";
import { MODELS, NEW_VARIANT_NAMES, outputModeFor, pinnedProviderFor } from "./constants";
import evidence from "./effort-levels.json";

test("current families contain every supported effort up to their maximum", () => {
  const names = MODELS.map((model) => model.name);
  expect(new Set(names).size).toBe(names.length);
  for (const [family, entry] of Object.entries(evidence.families)) {
    const configured = MODELS.filter((model) => model.family === family && model.llm.modelId === entry.modelId);
    expect(configured.length).toBeGreaterThan(0);
    const representative = configured[0]!;
    for (const level of entry.levels) {
      const variant = configured.find((model) => model.effort === level);
      expect(variant?.name).toBe(`${family}-${level}`);
      expect(variant && pinnedProviderFor(variant)).toBe(pinnedProviderFor(representative));
      expect(variant && outputModeFor(variant)).toBe(outputModeFor(representative));
    }
    if (entry.levels.length === 0) expect(configured.some((model) => NEW_VARIANT_NAMES.has(model.name))).toBe(false);
  }
  expect(MODELS.find((model) => model.name === "claude-fable-5.1-max")).toBeDefined();
  expect(MODELS.find((model) => model.name === "claude-fable-5.1-max")).toBeUndefined();
});
