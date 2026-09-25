import { describe, expect, test } from "bun:test";
import {
  chartStats,
  effortInsight,
  effortLadders,
  scatterPoints,
  type ChartVariant,
} from "./chart-data";

function variant(
  family: string,
  effort: string,
  accuracy: number,
  provider = "openai",
): ChartVariant {
  const correct = accuracy / 10;
  return {
    model: `${family}-${effort}`,
    family,
    familyDisplayName: family,
    displayName: `${family} ${effort}`,
    effort,
    provider,
    reasoning: effort !== "none",
    overallAccuracy: accuracy,
    overallCorrect: correct,
    overallRuns: 10,
    bySize: [
      {
        size: "5x5",
        runs: 10,
        correct,
        accuracy,
        totalCost: 1,
        totalDurationMs: 20000,
        totalTokens: 1000,
      },
      {
        size: "20x20",
        runs: 0,
        correct: 0,
        accuracy: 0,
        totalCost: 0,
        totalDurationMs: 0,
        totalTokens: 0,
      },
    ],
  };
}

describe("chart data", () => {
  const variants = [
    variant("Alpha", "medium", 70),
    variant("Alpha", "low", 80),
    variant("Beta", "high", 90, "google"),
    variant("Beta", "low", 50, "google"),
    variant("Solo", "low", 40),
  ];

  test("per puzzle metrics use the selected size and exclude sizes without runs", () => {
    expect(chartStats(variants[0], "5x5")).toMatchObject({
      correct: 7,
      runs: 10,
      tokens: 1000,
    });
    expect(scatterPoints(variants, "5x5", "tokens")[0].x).toBe(100);
    expect(scatterPoints(variants, "20x20", "cost")).toEqual([]);
  });

  test("ladders use all levels even when Best is selected, while respecting provider and family filters", () => {
    const ladders = effortLadders(variants, {
      effort: "best",
      providers: ["openai"],
      families: ["Alpha"],
    });
    expect(
      ladders.map((ladder) => ladder.map((model) => model.effort)),
    ).toEqual([["low", "medium"]]);
    expect(
      effortLadders(variants, { effort: "all", providers: ["google"] }).map(
        (ladder) => ladder[0].family,
      ),
    ).toEqual(["Beta"]);
  });

  test("insight only names an observed decline for the active size", () => {
    expect(effortInsight(effortLadders(variants, {}), "5x5")).toContain(
      "Alpha",
    );
    expect(
      effortInsight(effortLadders(variants, { providers: ["google"] }), "5x5"),
    ).toContain("held steady or improved");
    expect(effortInsight([], "5x5")).toContain("Select families");
  });

  test("does not describe an unknown default level as higher effort", () => {
    const ladder = effortLadders(
      [variant("Gamma", "high", 80), variant("Gamma", "default", 20)],
      {},
    );
    expect(effortInsight(ladder)).toContain("no pairs of ordered effort levels");
  });
});
