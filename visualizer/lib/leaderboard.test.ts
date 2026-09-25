import { expect, test } from "bun:test";
import { applyFilters, validateFilters } from "./leaderboard";

const variants = [
  {
    model: "a-low",
    family: "a",
    provider: "one",
    effort: "low",
    reasoning: true,
    openWeights: false,
    complete: true,
    overallAccuracy: 70,
    overallRuns: 30,
    bySize: [{ size: "5x5", runs: 10, accuracy: 90, totalCost: 1 }],
  },
  {
    model: "a-high",
    family: "a",
    provider: "one",
    effort: "high",
    reasoning: true,
    openWeights: false,
    complete: true,
    overallAccuracy: 80,
    overallRuns: 30,
    bySize: [{ size: "5x5", runs: 10, accuracy: 60, totalCost: 2 }],
  },
  {
    model: "b",
    family: "b",
    provider: "two",
    effort: "none",
    reasoning: false,
    openWeights: true,
    complete: true,
    overallAccuracy: 60,
    overallRuns: 30,
    bySize: [{ size: "5x5", runs: 10, accuracy: 100, totalCost: 1 }],
  },
];

test("best selection is overall, then rows rank by selected size", () => {
  expect(
    applyFilters(variants, { size: "5x5" }).map((model) => model.model),
  ).toEqual(["b", "a-high"]);
  expect(
    applyFilters(variants, { effort: "all", size: "5x5" }).map(
      (model) => model.model,
    ),
  ).toEqual(["b", "a-low", "a-high"]);
});

test("provider, family, reasoning, weights and effort filters compose", () => {
  expect(
    applyFilters(variants, {
      providers: ["one"],
      families: ["a"],
      reasoning: true,
      openWeights: false,
      effort: "low",
    }).map((model) => model.model),
  ).toEqual(["a-low"]);
  expect(
    applyFilters(variants, { openWeights: true }).map((model) => model.model),
  ).toEqual(["b"]);
  expect(applyFilters(variants, { families: [] })).toEqual([]);
});

test("unknown filter values have helpful errors", () => {
  expect(
    validateFilters(variants, { providers: ["missing"] }, ["5x5"]),
  ).toContain("Unknown provider");
  expect(validateFilters(variants, { effort: "extreme" }, ["5x5"])).toContain(
    "Unknown effort",
  );
});
