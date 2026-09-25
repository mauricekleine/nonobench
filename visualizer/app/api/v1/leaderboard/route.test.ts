import { expect, test } from "bun:test";
import { GET } from "./route";
import { getVariants, rankLeaderboardRows } from "@/lib/data";

test("defaults to all levels and adds discovery metadata", async () => {
  const body = await GET(
    new Request("https://example.test/api/v1/leaderboard"),
  ).json();
  expect(body.models.length).toBeGreaterThan(0);
  expect(body.models.length).toBe(getVariants().length);
  expect(body.models[0]).toHaveProperty("displayName");
  expect(body.models[0]).toHaveProperty("openWeights");
  expect(body.models[0]).toHaveProperty("version");
});

test("version filter returns matching rows and rejects unknown versions", async () => {
  const root = "https://example.test/api/v1/leaderboard";
  const response = GET(new Request(`${root}?version=1.0,1.2`));
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.models.every((model: { version: string }) => ["1.0", "1.2"].includes(model.version))).toBe(true);
  expect(GET(new Request(`${root}?version=2.0`)).status).toBe(400);
});

test("equal displayed scores share competition ranks", () => {
  expect(rankLeaderboardRows([
    { accuracy: 90.04 },
    { accuracy: 80.04 },
    { accuracy: 80.03 },
    { accuracy: 70 },
  ]).map((row) => row.rank)).toEqual([1, 2, 2, 4]);
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
