import { expect, test } from "bun:test";

import { getVariants, listPuzzles, rankLeaderboardRows } from "@/lib/data";
import { site } from "./test-site";

const json = async (path: string, init?: RequestInit) => {
  const response = await site(path, init);
  return { status: response.status, body: await response.json() };
};

test("leaderboard defaults to all levels and adds discovery metadata", async () => {
  const { body } = await json("/api/v1/leaderboard");
  expect(body.models.length).toBeGreaterThan(0);
  expect(body.models.length).toBe(getVariants().length);
  expect(body.models[0]).toHaveProperty("displayName");
  expect(body.models[0]).toHaveProperty("openWeights");
  expect(body.models[0]).toHaveProperty("version");
});

test("leaderboard version filter returns matching rows and rejects unknown versions", async () => {
  const { status, body } = await json("/api/v1/leaderboard?version=1.0,1.2");
  expect(status).toBe(200);
  expect(
    body.models.every((model: { version: string }) => ["1.0", "1.2"].includes(model.version)),
  ).toBe(true);
  expect((await site("/api/v1/leaderboard?version=2.0")).status).toBe(400);
});

test("equal displayed scores share competition ranks", () => {
  expect(
    rankLeaderboardRows([
      { accuracy: 90.04 },
      { accuracy: 80.04 },
      { accuracy: 80.03 },
      { accuracy: 70 },
    ]).map((row) => row.rank),
  ).toEqual([1, 2, 2, 4]);
});

test("leaderboard filters models and rejects unknown values", async () => {
  const { body } = await json("/api/v1/leaderboard?provider=openai&effort=best");
  expect(body.models.every((model: { provider: string }) => model.provider === "openai")).toBe(
    true,
  );
  expect(new Set(body.models.map((model: { family: string }) => model.family)).size).toBe(
    body.models.length,
  );
  const invalid = await json("/api/v1/leaderboard?open_weights=maybe");
  expect(invalid.status).toBe(400);
  expect(invalid.body.error).toContain("open_weights");
});

test("empty provider and family lists impose no filter; empty effort means all", async () => {
  const all = await json("/api/v1/leaderboard?provider=%20,%20&family=,&effort=");
  expect(all.status).toBe(200);
  expect(all.body.models.length).toBe(getVariants().length);
  const { body } = await json(
    "/api/v1/leaderboard?provider=%20openai%20,%20anthropic%20&effort=best",
  );
  expect(body.models.length).toBeGreaterThan(0);
  expect(
    body.models.every((model: { provider: string }) =>
      ["openai", "anthropic"].includes(model.provider),
    ),
  ).toBe(true);
});

test("min_correct is opt in and uses the selected tier", async () => {
  const all = (await json("/api/v1/leaderboard")).body;
  const solved = (await json("/api/v1/leaderboard?min_correct=1")).body;
  expect(all.models.length).toBe(getVariants().length);
  expect(solved.models.length).toBeLessThan(all.models.length);
  expect(solved.models.every((model: { correct: number }) => model.correct >= 1)).toBe(true);
  const sized = (await json("/api/v1/leaderboard?size=5x5&min_correct=1")).body;
  expect(sized.models.every((model: { correct: number }) => model.correct >= 1)).toBe(true);
  expect((await site("/api/v1/leaderboard?min_correct=-1")).status).toBe(400);
});

test("provider discovery reports families and variant counts", async () => {
  const { body } = await json("/api/v1/providers");
  const openai = body.providers.find((provider: { id: string }) => provider.id === "openai");
  expect(openai.name).toBe("OpenAI");
  expect(openai.families.length).toBeGreaterThan(0);
  expect(openai.variantCount).toBeGreaterThanOrEqual(openai.families.length);
});

test("family discovery reports the selected best variant", async () => {
  const { body } = await json("/api/v1/families");
  const opus = body.families.find(
    (family: { family: string }) => family.family === "claude-opus-5.5",
  );
  expect(opus.displayName).toBe("Claude Opus 5.5");
  expect(opus.bestVariant).toBeTruthy();
  expect(opus.efforts.length).toBeGreaterThan(0);
});

test("comparison resolves family names through the shared resolver", async () => {
  const { status, body } = await json("/api/v1/compare", {
    method: "POST",
    body: JSON.stringify({ models: ["Claude Sonnet 4.5", "GLM 5", "Kimi K2.5", "DeepSeek V3.2"] }),
  });
  expect(status).toBe(200);
  expect(body.models.map((model: { model: string }) => model.model)).toEqual([
    "claude-4.5-sonnet-reasoning",
    "glm-5-reasoning-high",
    "kimi-k2.5-high",
    "deepseek-v3.2-high",
  ]);
});

test("comparison rejects unknown models", async () => {
  const response = await site("/api/v1/compare", {
    method: "POST",
    body: JSON.stringify({ models: ["Claude Sonnet 4.5", "not-a-model"] }),
  });
  expect(response.status).toBe(400);
});

test("model puzzle endpoint returns 40 outcomes and solved count", async () => {
  const { body } = await json("/api/v1/models/claude-opus-5.5-high/puzzles");
  expect(body.puzzles).toHaveLength(40);
  expect(body.solved).toBe(
    body.puzzles.filter((puzzle: { state: string }) => puzzle.state === "solved").length,
  );
  // Claude Opus 5.5 high ran Hard mode: 8 of 10 solved.
  const hard = body.puzzles.filter((puzzle: { size: string }) => puzzle.size === "20x20");
  expect(hard).toHaveLength(10);
  expect(hard.filter((puzzle: { state: string }) => puzzle.state === "solved")).toHaveLength(8);
});

test("path parameters are decoded once, as before", async () => {
  expect((await json("/api/v1/models/foo%20bar")).body.error).toBe(
    'Unknown model "foo bar". See /api/v1/leaderboard for model names.',
  );
  expect((await json("/api/v1/models/foo%2520bar")).body.error).toBe(
    'Unknown model "foo%20bar". See /api/v1/leaderboard for model names.',
  );
});

const id = listPuzzles()[0].id;

test("puzzle results filter model families and omit answers by default", async () => {
  const { status, body } = await json(`/api/v1/puzzles/${id}/results?family=gpt-6-sol`);
  expect(status).toBe(200);
  expect(body.runs.length).toBeGreaterThan(0);
  expect(
    body.runs.every(
      (run: { family: string; answer?: string }) =>
        run.family === "gpt-6-sol" && !("answer" in run),
    ),
  ).toBe(true);
});

test("puzzle answers are opt-in and invalid filters fail", async () => {
  const answers = (await json(`/api/v1/puzzles/${id}/results?include_answers=true&effort=best`))
    .body;
  expect(answers.runs.some((run: { answer?: string }) => "answer" in run)).toBe(true);
  expect((await site(`/api/v1/puzzles/${id}/results?reasoning=maybe`)).status).toBe(400);
  const size = await json(`/api/v1/puzzles/${id}/results?size=5x5`);
  expect(size.status).toBe(400);
  expect(size.body.error).toContain("one size");
});

test("runs page through the raw export", async () => {
  const { body } = await json("/api/v1/runs?limit=2&offset=1");
  expect(body.runs).toHaveLength(2);
  expect(body.total).toBeGreaterThan(2);
  expect(body.runs[0]).not.toHaveProperty("rawOutput");
  const withOutput = (await json("/api/v1/runs?limit=1&include_output=true")).body;
  expect(withOutput.runs[0]).toHaveProperty("rawInput");
  expect((await site("/api/v1/runs?limit=1.5")).status).toBe(400);
});

test("a puzzle check reports clue violations", async () => {
  const { status, body } = await json(`/api/v1/puzzles/${id}/check`, {
    method: "POST",
    body: JSON.stringify({ grid: "0".repeat(25) }),
  });
  expect(status).toBe(200);
  expect(body.correct).toBe(false);
  expect((await site(`/api/v1/puzzles/${id}/check`, { method: "POST", body: "{}" })).status).toBe(
    400,
  );
  expect((await site("/api/v1/puzzles/unknown/check", { method: "POST", body: "{}" })).status).toBe(
    404,
  );
});
