import { expect, test } from "bun:test";
import {
  applyFilters,
  parseApiFilters,
  sanitizeUrlFilters,
  validateFilters,
  variantVersion,
} from "./leaderboard";

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

test("URL filters drop invalid keys while keeping valid filters", () => {
  const query = {
    p: "one",
    f: null,
    v: "bogus",
    e: "bogus",
    r: "maybe",
    w: "maybe",
    s: "bogus",
    levels: null,
  };
  const parsed = sanitizeUrlFilters(variants, ["5x5"], query);
  expect(parsed.invalidKeys).toEqual(["e", "v", "s", "r", "w"]);
  expect(parsed.filters).toMatchObject({
    providers: ["one"],
    versions: undefined,
    effort: "best",
    reasoning: undefined,
    openWeights: undefined,
    size: undefined,
  });
  expect(
    sanitizeUrlFilters(variants, ["5x5"], {
      ...query,
      e: "high",
      v: "1.0,1.2",
      s: "5x5",
      r: "false",
      w: "true",
    }).invalidKeys,
  ).toEqual([]);
});

test("version filter uses explicit export tags before the legacy fallback", () => {
  const tagged = [
    { ...variants[0], version: "1.1" as const, legacy: true },
    { ...variants[1], legacy: false },
    { ...variants[2], legacy: true },
  ];
  expect(tagged.map(variantVersion)).toEqual(["1.1", "1.2", "1.0"]);
  expect(applyFilters(tagged, { versions: ["1.1"], effort: "all" }).map((model) => model.model)).toEqual(["a-low"]);
  expect(applyFilters(tagged, { versions: ["1.0", "1.2"], effort: "all" })).toHaveLength(2);
  expect(validateFilters(tagged, { versions: ["9.9" as "1.0"] }, ["5x5"])).toContain("Unknown version");
  expect(parseApiFilters(new URLSearchParams("version=1.1,1.2")).filters.versions).toEqual(["1.1", "1.2"]);
});

test("REST comma parsing trims and ignores empty entries", () => {
  const { filters } = parseApiFilters(
    new URLSearchParams("provider=+one+,,+two+&family=,+&effort="),
  );
  expect(filters).toMatchObject({
    providers: ["one", "two"],
    families: undefined,
    effort: "all",
  });
});

test("unknown weight status matches neither true nor false", () => {
  const unknown = [{ ...variants[0], openWeights: null }];
  expect(applyFilters(unknown, { openWeights: true })).toEqual([]);
  expect(applyFilters(unknown, { openWeights: false })).toEqual([]);
});

test("minimum solved filter uses the selected tier and keeps zero as the API default", () => {
  const zero = {
    ...variants[0],
    model: "zero",
    family: "zero",
    overallAccuracy: 0,
    overallCorrect: 0,
    bySize: [{ size: "5x5", runs: 10, correct: 2, accuracy: 20, totalCost: 1 }],
  };
  expect(applyFilters([zero], { effort: "all" })).toHaveLength(1);
  expect(applyFilters([zero], { effort: "all", minCorrect: 1 })).toHaveLength(0);
  expect(applyFilters([zero], { effort: "all", size: "5x5", minCorrect: 1 })).toHaveLength(1);
  expect(parseApiFilters(new URLSearchParams("min_correct=1")).filters.minCorrect).toBe(1);
  expect(parseApiFilters(new URLSearchParams()).filters.minCorrect).toBe(0);
  expect(parseApiFilters(new URLSearchParams("min_correct=1.5")).error).toContain("min_correct");
});
