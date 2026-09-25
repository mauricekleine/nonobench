import { expect, test } from "bun:test";
import { GET } from "./route";
import { getVariants } from "@/lib/data";

test("defaults to all levels and adds discovery metadata", async () => {
  const body = await GET(
    new Request("https://example.test/api/v1/leaderboard"),
  ).json();
  expect(body.models.length).toBeGreaterThan(0);
  expect(body.models.length).toBe(getVariants().length);
  expect(body.models[0]).toHaveProperty("displayName");
  expect(body.models[0]).toHaveProperty("openWeights");
});

test("filters models and rejects unknown values", async () => {
  const response = GET(
    new Request(
      "https://example.test/api/v1/leaderboard?provider=openai&effort=best",
    ),
  );
  const body = await response.json();
  expect(
    body.models.every(
      (model: { provider: string }) => model.provider === "openai",
    ),
  ).toBe(true);
  expect(
    new Set(body.models.map((model: { family: string }) => model.family)).size,
  ).toBe(body.models.length);
  const invalid = GET(
    new Request("https://example.test/api/v1/leaderboard?open_weights=maybe"),
  );
  expect(invalid.status).toBe(400);
  expect((await invalid.json()).error).toContain("open_weights");
});
