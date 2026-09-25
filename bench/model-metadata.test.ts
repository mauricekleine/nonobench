import { expect, test } from "bun:test";
import metadata from "./model-metadata.json";
import overrides from "./model-metadata-overrides.json";

test("public weight overrides have cited sources and survive refresh", () => {
  const snapshot = metadata as Record<string, { openWeights: boolean | null }>;
  for (const [id, override] of Object.entries(overrides)) {
    expect(override.sourceUrl.startsWith("https://huggingface.co/")).toBe(true);
    expect(snapshot[id]?.openWeights).toBe(override.openWeights);
  }
});
