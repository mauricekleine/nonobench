import { expect, test } from "bun:test";
import { selectBestVariants } from "./select-best-variants";

function variant(model, family, effort, accuracy, cost) {
	return { model, family, effort, overallAccuracy: accuracy, overallRuns: 10, bySize: [{ totalCost: cost }] };
}

test("selects one variant per family by overall accuracy, cost, then effort", () => {
	const models = [
		variant("a-low", "a", "low", 80, 1),
		variant("a-high", "a", "high", 90, 10),
		variant("b-high", "b", "high", 90, 2),
		variant("b-low", "b", "low", 90, 1),
		variant("c-high", "c", "high", 90, 1),
		variant("c-minimal", "c", "minimal", 90, 1),
	];

	expect(selectBestVariants(models).map((model) => model.model)).toEqual([
		"a-high", "b-low", "c-minimal",
	]);
	expect(models[0].model).toBe("a-low");
});

test("can choose a non-reasoning variant after reasoning variants are filtered out", () => {
	const models = [
		variant("a-none", "a", "none", 70, 1),
		variant("a-high", "a", "high", 90, 1),
	];
	expect(selectBestVariants(models.filter((model) => model.effort === "none"))[0].model).toBe("a-none");
});
