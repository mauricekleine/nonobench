import { describe, expect, test } from "bun:test";
import {
  chartStats,
  decadeTicks,
  effortInsight,
  effortLadders,
  effortRowDomain,
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

  test("log ticks land on every power of ten within the domain", () => {
    expect(decadeTicks(0.0003, 1.2)).toEqual([0.001, 0.01, 0.1, 1]);
    expect(decadeTicks(900, 110000)).toEqual([1000, 10000, 100000]);
    expect(decadeTicks(0, 10)).toEqual([]);
    expect(decadeTicks(1, Number.POSITIVE_INFINITY)).toEqual([]);
  });

  test("ladders use all levels even when Best is selected, while respecting provider and family filters", () => {
    const ladders = effortLadders(variants, {
      effort: "best",
      providers: ["openai"],
      families: ["Alpha"],
    });
    expect(
      ladders.map((ladder) => ladder.variants.map((model) => model.effort)),
    ).toEqual([["low", "medium"]]);
    expect(
      effortLadders(variants, { effort: "all", providers: ["google"] }).map(
        (ladder) => ladder.variants[0].family,
      ),
    ).toEqual(["Beta"]);
  });

  test("orders the biggest endpoint change first, then the best score", () => {
    const groups = effortLadders(variants, {});
    expect(groups.map((group) => group.variants[0].family)).toEqual([
      "Beta",
      "Alpha",
    ]);
    expect(effortRowDomain(groups[0])).toEqual({ low: 42, high: 98 });
    const tied = effortLadders(
      [
        variant("Higher", "low", 50),
        variant("Higher", "high", 80),
        variant("Lower", "low", 30),
        variant("Lower", "high", 60),
      ],
      {},
    );
    expect(tied.map((group) => group.variants[0].family)).toEqual([
      "Higher",
      "Lower",
    ]);
    const thirds = effortLadders(
      [
        variant("Opus", "low", 60),
        variant("Opus", "high", (28 / 30) * 100),
        variant("Gemini", "low", (13 / 30) * 100),
        variant("Gemini", "high", (23 / 30) * 100),
      ],
      {},
    );
    expect(thirds.map((group) => group.variants[0].family)).toEqual([
      "Opus",
      "Gemini",
    ]);
  });

  test("insight leads with the biggest gain and a measured regression", () => {
    const score = (family: string, effort: string, correct: number) => {
      const model = variant(family, effort, (correct / 30) * 100);
      return { ...model, overallCorrect: correct, overallRuns: 30 };
    };
    const groups = effortLadders(
      [
        score("Claude Opus 5.5", "low", 18),
        score("Claude Opus 5.5", "medium", 27),
        score("Claude Opus 5.5", "high", 28),
        score("Gemini 3 Pro", "low", 0),
        score("Gemini 3 Pro", "high", 17),
        score("Grok 4.7", "low", 24),
        score("Grok 4.7", "medium", 23),
        score("Kimi K3", "low", 16),
        score("Kimi K3", "medium", 15),
      ],
      {},
    );
    const insight = effortInsight(groups);
    expect(insight).toContain(
      "Gemini 3 Pro scored 17 more puzzles at high than at low.",
    );
    expect(insight).toContain(
      "Grok 4.7 and Kimi K3 scored lower at medium than at low.",
    );
  });

  test("insight follows the active size and does not invent declines", () => {
    expect(
      effortInsight(effortLadders(variants, { families: ["Alpha"] }), "5x5"),
    ).toContain("Alpha");
    expect(
      effortInsight(effortLadders(variants, { providers: ["google"] }), "5x5"),
    ).toContain("Beta scored 4 more puzzles");
    expect(effortInsight([], "5x5")).toContain("Select families");
  });

  test("default reasoning is an off/on pair only with none, never above xhigh", () => {
    const groups = effortLadders(
      [
        variant("Reasoning", "none", 0),
        variant("Reasoning", "default", 70),
        variant("Unordered", "high", 80),
        variant("Unordered", "default", 20),
        variant("Ordered", "none", 0),
        variant("Ordered", "high", 60),
        variant("Ordered", "default", 55),
      ],
      {},
    );
    expect(
      groups.find((group) => group.variants[0].family === "Reasoning"),
    ).toMatchObject({
      kind: "reasoning",
      variants: [{ effort: "none" }, { effort: "default" }],
    });
    expect(
      groups
        .find((group) => group.variants[0].family === "Ordered")
        ?.variants.map((model) => model.effort),
    ).toEqual(["none", "high"]);
    expect(
      groups.some((group) => group.variants[0].family === "Unordered"),
    ).toBe(false);
    expect(
      effortInsight(groups.filter((group) => group.kind === "reasoning")),
    ).toContain("Reasoning solved 7 more puzzles with reasoning on than off");
  });
});
