import { describe, expect, test } from "bun:test";
import { effortRank, paretoFrontier, wilsonInterval } from "./insights";

describe("wilsonInterval", () => {
	test("brackets the observed rate", () => {
		const { low, high } = wilsonInterval(28, 30);
		expect(low).toBeLessThan(28 / 30);
		expect(high).toBeGreaterThan(28 / 30);
		expect(low).toBeCloseTo(0.787, 2);
		expect(high).toBeCloseTo(0.982, 2);
	});

	test("stays inside [0, 1] at the extremes", () => {
		expect(wilsonInterval(0, 10).low).toBe(0);
		expect(wilsonInterval(0, 10).high).toBeGreaterThan(0);
		expect(wilsonInterval(10, 10).high).toBe(1);
		expect(wilsonInterval(10, 10).low).toBeLessThan(1);
	});

	test("handles an empty sample", () => {
		expect(wilsonInterval(0, 0)).toEqual({ low: 0, high: 0 });
	});
});

describe("paretoFrontier", () => {
	test("keeps only points that nothing cheaper and at least as accurate beats", () => {
		const points = [
			{ id: "cheap-weak", x: 0.1, y: 30 },
			{ id: "dominated", x: 2, y: 40 },
			{ id: "mid", x: 1, y: 70 },
			{ id: "tie-pricier", x: 3, y: 70 },
			{ id: "best", x: 5, y: 93 },
		];
		expect(paretoFrontier(points).map((point) => point.id)).toEqual(["cheap-weak", "mid", "best"]);
	});

	test("ignores points with missing values", () => {
		expect(paretoFrontier([{ id: "a", x: Number.NaN, y: 1 }, { id: "b", x: 1, y: 1 }]).map((p) => p.id)).toEqual(["b"]);
	});
});

describe("effortRank", () => {
	test("orders known levels and puts unknown ones last", () => {
		const efforts = ["high", "default", "max", "low", "xhigh", "none", "medium"];
		expect([...efforts].sort((a, b) => effortRank(a) - effortRank(b))).toEqual(["none", "low", "medium", "high", "xhigh", "max", "default"]);
	});
});
