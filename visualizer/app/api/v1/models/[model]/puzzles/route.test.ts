import { expect, test } from "bun:test";
import { GET } from "./route";

test("model puzzle endpoint returns 40 outcomes and solved count", async () => {
  const response = await GET(new Request("https://example.test/api/v1/models/claude-opus-5.5-high/puzzles"), { params: Promise.resolve({ model: "claude-opus-5.5-high" }) } as RouteContext<"/api/v1/models/[model]/puzzles">);
  const body = await response.json();
  expect(body.puzzles).toHaveLength(40);
  expect(body.solved).toBe(body.puzzles.filter((puzzle: { state: string }) => puzzle.state === "solved").length);
  // Claude Opus 5.5 high ran Hard mode: 8 of 10 solved.
  const hard = body.puzzles.filter((puzzle: { size: string }) => puzzle.size === "20x20");
  expect(hard).toHaveLength(10);
  expect(hard.filter((puzzle: { state: string }) => puzzle.state === "solved")).toHaveLength(8);
});
