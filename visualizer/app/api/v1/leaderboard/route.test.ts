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

test("empty provider and family lists impose no filter; empty effort means all", async () => {
  const response = GET(
    new Request(
      "https://example.test/api/v1/leaderboard?provider=%20,%20&family=,&effort=",
    ),
  );
  expect(response.status).toBe(200);
  expect((await response.json()).models.length).toBe(getVariants().length);
  const trimmed = GET(
    new Request(
      "https://example.test/api/v1/leaderboard?provider=%20openai%20,%20anthropic%20&effort=best",
    ),
  );
  const body = await trimmed.json();
  expect(body.models.length).toBeGreaterThan(0);
  expect(
    body.models.every((model: { provider: string }) =>
      ["openai", "anthropic"].includes(model.provider),
    ),
  ).toBe(true);
});

test("min_correct is opt in and uses the selected tier", async () => {
  const root = "https://example.test/api/v1/leaderboard";
  const all = await GET(new Request(root)).json();
  const solved = await GET(new Request(`${root}?min_correct=1`)).json();
  expect(all.models.length).toBe(getVariants().length);
  expect(solved.models.length).toBeLessThan(all.models.length);
  expect(solved.models.every((model: { correct: number }) => model.correct >= 1)).toBe(true);
  const sized = await GET(new Request(`${root}?size=5x5&min_correct=1`)).json();
  expect(sized.models.every((model: { correct: number }) => model.correct >= 1)).toBe(true);
  expect(GET(new Request(`${root}?min_correct=-1`)).status).toBe(400);
});
