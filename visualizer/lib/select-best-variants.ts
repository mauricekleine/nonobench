type Variant = {
	model: string;
	family: string;
	effort: string;
	overallAccuracy: number;
	overallRuns: number;
	bySize: { totalCost: number }[];
};

const effortOrder: Record<string, number> = {
	none: 0,
	minimal: 1,
	low: 2,
	medium: 3,
	high: 4,
	xhigh: 5,
	// An unspecified provider default has no known level, so explicit levels win a tie.
	default: 6,
};

function averageCost(model: Variant): number {
	const totalCost = model.bySize.reduce((sum, size) => sum + size.totalCost, 0);
	return model.overallRuns > 0 ? totalCost / model.overallRuns : 0;
}

function isBetter(candidate: Variant, current: Variant): boolean {
	if (candidate.overallAccuracy !== current.overallAccuracy) {
		return candidate.overallAccuracy > current.overallAccuracy;
	}
	const costDifference = averageCost(candidate) - averageCost(current);
	if (costDifference !== 0) return costDifference < 0;
	const effortDifference = (effortOrder[candidate.effort] ?? Infinity) - (effortOrder[current.effort] ?? Infinity);
	if (effortDifference !== 0) return effortDifference < 0;
	return candidate.model.localeCompare(current.model) < 0;
}

// Pass only variants allowed by the reasoning filters. The selected model is
// independent of the chart's size filter because accuracy is always overall.
export function selectBestVariants<T extends Variant>(models: T[]): T[] {
	const bestByFamily = new Map<string, T>();
	for (const model of models) {
		const current = bestByFamily.get(model.family);
		if (!current || isBetter(model, current)) bestByFamily.set(model.family, model);
	}
	return [...bestByFamily.values()];
}
