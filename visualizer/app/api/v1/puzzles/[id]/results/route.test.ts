import { expect, test } from "bun:test";
import { listPuzzles } from "@/lib/data";
import { GET } from "./route";

const id = listPuzzles()[0].id;
const context = { params: Promise.resolve({ id }) } as RouteContext<"/api/v1/puzzles/[id]/results">;

test("puzzle results filter model families and omit answers by default", async () => {
  const response = await GET(new Request(`https://example.test/api/v1/puzzles/${id}/results?family=gpt-6-sol`), context);
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.runs.length).toBeGreaterThan(0);
  expect(body.runs.every((run: { family: string; answer?: string }) => run.family === "gpt-6-sol" && !("answer" in run))).toBe(true);
});

test("answers are opt-in and invalid filters fail", async () => {
  const answer = await (await GET(new Request(`https://example.test/api/v1/puzzles/${id}/results?include_answers=true&effort=best`), context)).json();
  expect(answer.runs.some((run: { answer?: string }) => "answer" in run)).toBe(true);
  expect((await GET(new Request(`https://example.test/api/v1/puzzles/${id}/results?reasoning=maybe`), context)).status).toBe(400);
  const sizeResponse = await GET(new Request(`https://example.test/api/v1/puzzles/${id}/results?size=5x5`), context);
  expect(sizeResponse.status).toBe(400);
  expect((await sizeResponse.json()).error).toContain("one size");
});
