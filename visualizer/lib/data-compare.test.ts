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
