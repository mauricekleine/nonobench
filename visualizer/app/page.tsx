"use client";

import {
	CaretDown,
	CaretUp,
	CaretUpDown,
	ChartBar,
	Coffee,
	DownloadSimple,
	GithubLogo,
	GridFour,
	Heart,
	Info,
	Lightning,
	Question,
	Robot,
	Rows,
	Warning,
	XLogo,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	LabelList,
	XAxis,
	YAxis,
} from "recharts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";

import resultsData from "./results.json";
import { PUZZLES } from "@/components/puzzles";

type SizeData = {
	size: string;
	accuracy: number;
	correct: number;
	failed: number;
	total: number;
	avgDurationMs: number;
	avgTokens: number;
	totalTokens: number;
	avgCost: number;
	totalCost: number;
};

type ModelData = {
	model: string;
	overallAccuracy: number;
	overallCorrect: number;
	overallFailed: number;
	overallTotal: number;
	bySize: SizeData[];
};

type SortColumn = "accuracy" | "totalCost" | "avgCost" | "totalTime" | "avgTime";
type SortDirection = "asc" | "desc";

type Results = {
	timestamp: string;
	summary: {
		models: string[];
		sizes: string[];
	};
	byModel: ModelData[];
	chartData: (SizeData & { model: string })[];
};

const results = resultsData as Results;

const chartConfig = {
	accuracy: {
		label: "Accuracy",
		color: "var(--chart-1)",
	},
} satisfies ChartConfig;

// Generate a color based on rank (0 = brightest/top, higher = dimmer)
// Uses the primary color hue (160 in dark mode) with decreasing lightness
function getRankColor(rank: number, total: number): string {
	// Primary color in dark mode: oklch(0.75 0.18 160)
	const maxLightness = 0.78;
	const minLightness = 0.4;
	const maxChroma = 0.20;
	const minChroma = 0.10;
	const hue = 160; // teal-green hue matching primary

	// Calculate lightness and chroma based on rank (0 = brightest)
	const t = total > 1 ? rank / (total - 1) : 0;
	const lightness = maxLightness - t * (maxLightness - minLightness);
	const chroma = maxChroma - t * (maxChroma - minChroma);

	return `oklch(${lightness.toFixed(3)} ${chroma.toFixed(3)} ${hue})`;
}


function formatModelName(name: string): string {
	return name
}

function formatDuration(ms: number): string {
	if (ms < 1000) return `${Math.round(ms)}ms`;
	return `${(ms / 1000).toFixed(2)}s`;
}

function formatCost(cost: number): string {
	if (cost < 0.01) return `$${cost.toFixed(4)}`;
	return `$${cost.toFixed(2)}`;
}

// Helper to get accuracy for a specific size
function getAccuracyForSize(modelData: ModelData, size: string): number {
	const sizeData = modelData.bySize.find((s) => s.size === size);
	return sizeData?.accuracy ?? 0;
}

// Helper to get model stats (excluding failed tests from averages)
function getModelStats(modelData: ModelData) {
	const totalDuration = modelData.bySize.reduce(
		(sum, s) => sum + s.avgDurationMs * s.total,
		0,
	);
	const totalPuzzles = modelData.overallTotal;
	const totalFailed = modelData.overallFailed;
	const runs = totalPuzzles - totalFailed; // Successful runs only
	const correct = modelData.overallCorrect;

	// Calculate averages based on successful runs only
	const avgDuration = runs > 0 ? totalDuration / runs : 0;
	const totalCost = modelData.bySize.reduce((sum, s) => sum + s.totalCost, 0);
	const avgCost = runs > 0 ? totalCost / runs : 0;

	// Recalculate accuracy excluding failed tests
	const accuracy = runs > 0 ? (correct / runs) * 100 : 0;

	return { avgDuration, totalDuration, totalCost, avgCost, totalFailed, runs, correct, accuracy };
}

export default function Page() {
	const [selectedSize, setSelectedSize] = useState<string>("all");
	const [aboutOpen, setAboutOpen] = useState(false);
	const [sortColumn, setSortColumn] = useState<SortColumn>("accuracy");
	const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

	const handleSort = (column: SortColumn) => {
		if (sortColumn === column) {
			setSortDirection(sortDirection === "asc" ? "desc" : "asc");
		} else {
			setSortColumn(column);
			setSortDirection(column === "accuracy" ? "desc" : "asc");
		}
	};

	const getSortIcon = (column: SortColumn) => {
		if (sortColumn !== column) {
			return <CaretUpDown className="size-3 text-muted-foreground/50" />;
		}
		return sortDirection === "asc" ? (
			<CaretUp className="size-3 text-primary" weight="bold" />
		) : (
			<CaretDown className="size-3 text-primary" weight="bold" />
		);
	};

	const sizes = useMemo(() => ["all", ...results.summary.sizes], []);

	// Detect empty data state
	const isEmptyData = useMemo(() => {
		return results.byModel.every((m) => m.overallAccuracy === 0);
	}, []);

	const chartData = useMemo(() => {
		const getChartModelStats = (model: ModelData) => {
			if (selectedSize === "all") {
				const totalDuration = model.bySize.reduce(
					(sum, s) => sum + s.avgDurationMs * s.total,
					0,
				);
				const totalCost = model.bySize.reduce(
					(sum, s) => sum + s.totalCost,
					0,
				);
				// Exclude failed tests from calculations
				const runs = model.overallTotal - model.overallFailed;
				const accuracy = runs > 0 ? (model.overallCorrect / runs) * 100 : 0;
				return {
					model: model.model,
					displayName: formatModelName(model.model),
					accuracy,
					correct: model.overallCorrect,
					total: runs,
					avgDuration: runs > 0 ? totalDuration / runs : 0,
					totalCost,
				};
			}

			const sizeData = model.bySize.find((s) => s.size === selectedSize);
			if (!sizeData) {
				return {
					model: model.model,
					displayName: formatModelName(model.model),
					accuracy: 0,
					correct: 0,
					total: 0,
					avgDuration: 0,
					totalCost: 0,
				};
			}
			// Exclude failed tests from calculations
			const runs = sizeData.total - sizeData.failed;
			const accuracy = runs > 0 ? (sizeData.correct / runs) * 100 : 0;
			return {
				model: model.model,
				displayName: formatModelName(model.model),
				accuracy,
				correct: sizeData.correct,
				total: runs,
				avgDuration: runs > 0 ? (sizeData.avgDurationMs * sizeData.total) / runs : 0,
				totalCost: sizeData.totalCost,
			};
		};

		const data = results.byModel.map((model) => getChartModelStats(model));

		// Sort by accuracy (highest first), then alphabetically for ties
		const sorted = data.sort((a, b) => {
			const diff = b.accuracy - a.accuracy;
			if (diff !== 0) return diff;
			return a.model.localeCompare(b.model);
		});
		return sorted.map((item, rank) => ({
			...item,
			fill: getRankColor(rank, sorted.length),
		}));
	}, [selectedSize]);

	const sortedModels = useMemo(() => {
		return [...results.byModel].sort((a, b) => {
			const statsA = getModelStats(a);
			const statsB = getModelStats(b);

			let comparison = 0;
			switch (sortColumn) {
				case "accuracy":
					comparison = statsA.accuracy - statsB.accuracy;
					break;
				case "totalCost":
					comparison = statsA.totalCost - statsB.totalCost;
					break;
				case "avgCost":
					comparison = statsA.avgCost - statsB.avgCost;
					break;
				case "totalTime":
					comparison = statsA.totalDuration - statsB.totalDuration;
					break;
				case "avgTime":
					comparison = statsA.avgDuration - statsB.avgDuration;
					break;
			}

			const primaryResult = sortDirection === "asc" ? comparison : -comparison;

			// Secondary sort: alphabetically by model name when primary values are equal
			if (primaryResult === 0) {
				return a.model.localeCompare(b.model);
			}

			return primaryResult;
		});
	}, [sortColumn, sortDirection]);

	// Calculate benchmark stats
	const benchmarkStats = useMemo(() => {
		const totalModels = results.summary.models.length;
		const puzzlesPerModel = PUZZLES.length;
		const totalRuns = results.byModel.reduce((sum, model) => sum + model.overallTotal - model.overallFailed, 0);
		return { totalModels, totalPuzzles: puzzlesPerModel, totalRuns };
	}, []);

	return (
		<div className="min-h-screen bg-background">
			{/* Grid pattern background for Nonogram theme */}
			<div className="fixed inset-0 grid-pattern pointer-events-none" />
			{/* Subtle gradient background */}
			<div className="fixed inset-0 bg-linear-to-br from-primary/5 via-transparent to-chart-2/5 pointer-events-none" />

			<div className="relative max-w-7xl mx-auto px-6 py-12">
				{/* Header */}
				<header className="mb-4">
					<div className="flex items-center gap-3 mb-2">
						<div className="p-2 bg-primary/20 rounded-lg">
							<GridFour className="size-6 text-primary" weight="duotone" />
						</div>
						<h1 className="text-3xl font-bold tracking-tight">
							NonoBench Results
						</h1>
					</div>
					<p className="text-muted-foreground max-w-2xl">
						Benchmark results for LLM performance on Nonogram puzzle solving.
						Comparing accuracy, speed, and cost across different grid sizes.
					</p>

					{/* Benchmark stats */}
					<div className="flex items-center gap-4 my-4">
						<div className="flex items-center gap-1.5 text-xs">
							<GridFour className="size-3.5 text-primary" weight="duotone" />
							<span className="text-muted-foreground">Puzzles:</span>
							<span className="font-mono font-medium text-foreground">{benchmarkStats.totalPuzzles}</span>
						</div>
						<div className="flex items-center gap-1.5 text-xs">
							<Robot className="size-3.5 text-primary" weight="duotone" />
							<span className="text-muted-foreground">Models:</span>
							<span className="font-mono font-medium text-foreground">{benchmarkStats.totalModels}</span>
						</div>
						<div className="flex items-center gap-1.5 text-xs">
							<Lightning className="size-3.5 text-primary" weight="duotone" />
							<span className="text-muted-foreground">Total runs:</span>
							<span className="font-mono font-medium text-foreground">{benchmarkStats.totalRuns}</span>
						</div>
					</div>

					{/* Action buttons */}
					<Collapsible open={aboutOpen} onOpenChange={setAboutOpen}>
						<div className="flex flex-wrap items-center gap-2 mt-4">
							<CollapsibleTrigger className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted border border-border rounded-full transition-all cursor-pointer whitespace-nowrap">
								<Question className="size-4" weight="bold" />
								<span>What are Nonograms?</span>
								<CaretDown
									className={`size-3 transition-transform ${aboutOpen ? "rotate-180" : ""}`}
								/>
							</CollapsibleTrigger>

							<Link
								href="/puzzles"
								className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted border border-border rounded-full transition-all whitespace-nowrap"
							>
								<Rows className="size-4" weight="bold" />
								<span>Explore Puzzles</span>
							</Link>

							<button
								type="button"
								onClick={() => {
									const blob = new Blob([JSON.stringify(results, null, 2)], {
										type: "application/json",
									});
									const url = URL.createObjectURL(blob);
									const a = document.createElement("a");
									a.href = url;
									a.download = "nonobench-results.json";
									a.click();
									URL.revokeObjectURL(url);
								}}
								className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted border border-border rounded-full transition-all cursor-pointer whitespace-nowrap"
							>
								<DownloadSimple className="size-4" weight="bold" />
								<span>Download Results</span>
							</button>
						</div>

						<CollapsibleContent>
							<div className="mt-3 p-4 rounded-lg bg-muted/50 border border-border text-sm text-muted-foreground space-y-2">
								<p>
									<strong className="text-foreground">Nonograms</strong> (also
									known as Picross, Griddlers, or Paint by Numbers) are logic
									puzzles where you fill in cells on a grid based on numeric
									clues provided for each row and column.
								</p>
								<p>
									Each clue indicates the lengths of consecutive filled cells in
									that row or column. For example, a clue of &ldquo;3 1&rdquo; means there
									are exactly 3 consecutive filled cells, followed by at least
									one empty cell, then 1 filled cell.
								</p>
								<p>
									This benchmark tests how well LLMs can solve these puzzles
									across different grid sizes (5×5, 10×10, 15×15), measuring
									accuracy, response time, and cost.
								</p>
								<a
									href="https://en.wikipedia.org/wiki/Nonogram"
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-1 text-primary hover:underline"
								>
									Learn more on Wikipedia
									<Info className="size-3" />
								</a>
							</div>
						</CollapsibleContent>
					</Collapsible>
					<p className="text-xs text-muted-foreground/60 mt-6 font-mono">
						Last updated: {new Date(results.timestamp).toLocaleString()}
					</p>
				</header>

				{/* Empty Data Warning */}
				{isEmptyData && (
					<Alert className="mb-8 border-amber-500/50 bg-amber-500/10">
						<Warning className="size-4 text-amber-500" weight="bold" />
						<AlertTitle className="text-amber-600 dark:text-amber-400">
							No Results Yet
						</AlertTitle>
						<AlertDescription className="text-amber-600/80 dark:text-amber-400/80">
							All models show 0% accuracy. This may indicate the benchmark
							hasn&apos;t been run yet, or results are still being collected. Run the
							benchmark to populate this dashboard with real data.
						</AlertDescription>
					</Alert>
				)}

				{/* Main Chart */}
				<section className="mb-10">
					<Card>
						<CardHeader>
							<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
								<div>
									<CardTitle className="flex items-center gap-2">
										<ChartBar className="size-4" weight="bold" />
										Model Accuracy
									</CardTitle>
								</div>
								<div className="flex items-center gap-2">
									<span className="text-xs text-muted-foreground">
										Size:
									</span>
									<Select
										value={selectedSize}
										onValueChange={(value) => setSelectedSize(value ?? "all")}
									>
										<SelectTrigger className="w-28">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{sizes.map((size) => (
												<SelectItem key={size} value={size}>
													{size === "all" ? "All Sizes" : size}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>
						</CardHeader>
						<CardContent>
							<ChartContainer
								config={chartConfig}
								className="h-[400px] w-full"
							>
								<BarChart
									data={chartData}
									margin={{ top: 30, right: 20, bottom: 60, left: 20 }}
								>
									<CartesianGrid
										vertical={false}
										strokeDasharray="3 3"
										stroke="var(--border)"
									/>
									<XAxis
										dataKey="displayName"
										axisLine={false}
										tickLine={false}
										tick={{ fontSize: 11 }}
										interval={0}
										angle={-35}
										textAnchor="end"
										height={60}
									/>
									<YAxis
										domain={[0, 100]}
										tickFormatter={(v) => `${v}%`}
										axisLine={false}
										tickLine={false}
										width={45}
									/>
									<ChartTooltip
										content={
											<ChartTooltipContent
												hideLabel
												hideIndicator
												formatter={(value, name, props) => (
													<div className="flex flex-col gap-0.5">
														<span className="font-medium">
															{props.payload.displayName}
														</span>
														<span className="text-muted-foreground">
															{props.payload.correct}/{props.payload.total}{" "}
															solved ({Number(value).toFixed(1)}%)
														</span>
													</div>
												)}
											/>
										}
									/>
									<Bar dataKey="accuracy" radius={[4, 4, 0, 0]}>
										{chartData.map((entry, index) => (
											<Cell key={`cell-${index}`} fill={entry.fill} />
										))}
										<LabelList
											dataKey="accuracy"
											position="top"
											formatter={(v: number) => `${v.toFixed(0)}%`}
											className="fill-foreground font-mono text-xs font-semibold"
										/>
									</Bar>
								</BarChart>
							</ChartContainer>
						</CardContent>
					</Card>
				</section>

				{/* Per-Model Stats (Table) */}
				<section>
					<h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
						Detailed Model Statistics
					</h2>
					<div className="rounded-lg border border-border bg-card overflow-hidden">
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b border-border bg-muted/30">
										<th className="sticky left-0 bg-muted/30 backdrop-blur-sm text-left font-medium px-4 py-3 border-r border-border">
											Model
										</th>
										<th
											className="text-left font-medium px-4 py-3 whitespace-nowrap cursor-pointer hover:bg-muted/50 transition-colors select-none"
											onClick={() => handleSort("accuracy")}
										>
											<div className="flex items-center gap-1">
												Overall
												{getSortIcon("accuracy")}
											</div>
										</th>
										<th className="text-left font-medium px-4 py-3 whitespace-nowrap">
											5×5
										</th>
										<th className="text-left font-medium px-4 py-3 whitespace-nowrap">
											10×10
										</th>
										<th className="text-left font-medium px-4 py-3 whitespace-nowrap">
											15×15
										</th>
										<th className="text-left font-medium px-4 py-3 whitespace-nowrap">
											Runs
										</th>
										<th className="text-left font-medium px-4 py-3 whitespace-nowrap">
											Correct
										</th>
										<th
											className="text-left font-medium px-4 py-3 whitespace-nowrap hover:bg-muted/50 transition-colors select-none"
										>
											<div className="flex items-center gap-1">
												Failed
												<Tooltip>
													<TooltipTrigger
														className="p-0.5 rounded hover:bg-muted"
														onClick={(e) => e.stopPropagation()}
													>
														<Info className="size-3.5 text-muted-foreground" weight="bold" />
													</TooltipTrigger>
													<TooltipContent side="top" className="max-w-xs">
														Failed requests due to various reasons such as invalid JSON responses, timeouts, rate limits, or other API errors.
													</TooltipContent>
												</Tooltip>
											</div>
										</th>
										<th
											className="text-left font-medium px-4 py-3 whitespace-nowrap cursor-pointer hover:bg-muted/50 transition-colors select-none"
											onClick={() => handleSort("totalCost")}
										>
											<div className="flex items-center gap-1">
												Total Cost
												{getSortIcon("totalCost")}
											</div>
										</th>
										<th
											className="text-left font-medium px-4 py-3 whitespace-nowrap cursor-pointer hover:bg-muted/50 transition-colors select-none"
											onClick={() => handleSort("avgCost")}
										>
											<div className="flex items-center gap-1">
												Avg Cost
												{getSortIcon("avgCost")}
											</div>
										</th>
										<th
											className="text-left font-medium px-4 py-3 whitespace-nowrap cursor-pointer hover:bg-muted/50 transition-colors select-none"
											onClick={() => handleSort("totalTime")}
										>
											<div className="flex items-center gap-1">
												Total Time
												{getSortIcon("totalTime")}
											</div>
										</th>
										<th
											className="text-left font-medium px-4 py-3 whitespace-nowrap cursor-pointer hover:bg-muted/50 transition-colors select-none"
											onClick={() => handleSort("avgTime")}
										>
											<div className="flex items-center gap-1">
												Avg Time
												{getSortIcon("avgTime")}
											</div>
										</th>
									</tr>
								</thead>
								<tbody>
									{sortedModels.map((modelData, index) => {
										const stats = getModelStats(modelData);
										return (
											<tr
												key={modelData.model}
												className="border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors"
											>
												<td className="sticky left-0 bg-card/30 backdrop-blur-sm px-4 py-3 border-r border-border">
													<div className="flex items-center gap-2">
														<div
															className="w-2.5 h-2.5 mt-0.5 rounded-full shrink-0"
															style={{
																background: getRankColor(index, sortedModels.length),
															}}
														/>
														<span className="font-medium truncate">
															{formatModelName(modelData.model)}
														</span>
													</div>
												</td>
												<td className="text-left px-4 py-3">
													<span className="font-mono font-bold text-primary" style={{
														color: getRankColor(index, sortedModels.length),
													}}>
														{stats.accuracy.toFixed(1)}%
													</span>
												</td>
												<td className="text-left px-4 py-3">
													<span className="font-mono text-muted-foreground">
														{getAccuracyForSize(modelData, "5x5").toFixed(0)}%
													</span>
												</td>
												<td className="text-left px-4 py-3">
													<span className="font-mono text-muted-foreground">
														{getAccuracyForSize(modelData, "10x10").toFixed(0)}%
													</span>
												</td>
												<td className="text-left px-4 py-3">
													<span className="font-mono text-muted-foreground">
														{getAccuracyForSize(modelData, "15x15").toFixed(0)}%
													</span>
												</td>
												<td className="text-left px-4 py-3">
													<span className="font-mono text-muted-foreground">
														{stats.runs}
													</span>
												</td>
												<td className="text-left px-4 py-3">
													<span className="font-mono text-muted-foreground">
														{stats.correct}
													</span>
												</td>
												<td className="text-left px-4 py-3">
													<span className={`font-mono ${stats.totalFailed > 0 ? "text-amber-500" : "text-muted-foreground"}`}>
														{stats.totalFailed}
													</span>
												</td>
												<td className="text-left px-4 py-3">
													<span className="font-mono text-muted-foreground">
														{formatCost(stats.totalCost)}
													</span>
												</td>
												<td className="text-left px-4 py-3">
													<span className="font-mono text-muted-foreground">
														{formatCost(stats.avgCost)}
													</span>
												</td>
												<td className="text-left px-4 py-3">
													<span className="font-mono text-muted-foreground">
														{formatDuration(stats.totalDuration)}
													</span>
												</td>
												<td className="text-left px-4 py-3">
													<span className="font-mono text-muted-foreground">
														{formatDuration(stats.avgDuration)}
													</span>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					</div>
				</section>

				{/* Per-Size Stats */}
				<section className="mt-10">
					<h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
						Statistics by Grid Size
					</h2>
					<div className="grid md:grid-cols-3 gap-6">
						{results.summary.sizes.map((size) => {
							const sizeStats = results.chartData.filter(
								(d) => d.size === size,
							);
							const totalCorrect = sizeStats.reduce(
								(sum, s) => sum + s.correct,
								0,
							);
							const totalPuzzles = sizeStats.reduce(
								(sum, s) => sum + s.total,
								0,
							);
							const avgAccuracy =
								sizeStats.reduce((sum, s) => sum + s.accuracy, 0) /
								sizeStats.length;
							const avgDuration =
								sizeStats.reduce((sum, s) => sum + s.avgDurationMs, 0) /
								sizeStats.length;
							const totalCost = sizeStats.reduce(
								(sum, s) => sum + s.totalCost,
								0,
							);

							return (
								<Card key={size}>
									<CardHeader className="pb-2">
										<CardTitle className="flex items-center gap-2">
											<div className="px-2 py-1 bg-muted rounded font-mono text-sm">
												{size}
											</div>
											Grid
										</CardTitle>
									</CardHeader>
									<CardContent>
										<div className="grid grid-cols-2 gap-4 mb-4">
											<div>
												<p className="text-muted-foreground text-xs">
													Avg Accuracy
												</p>
												<p className="font-mono text-2xl font-bold">
													{avgAccuracy.toFixed(1)}%
												</p>
											</div>
											<div>
												<p className="text-muted-foreground text-xs">Solved</p>
												<p className="font-mono text-2xl font-bold">
													{totalCorrect}
													<span className="text-muted-foreground text-sm">
														/{totalPuzzles}
													</span>
												</p>
											</div>
										</div>

										<div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
											<div>
												<p className="text-muted-foreground text-[10px] uppercase tracking-wide">
													Avg Time
												</p>
												<p className="font-mono text-sm">
													{formatDuration(avgDuration)}
												</p>
											</div>
											<div>
												<p className="text-muted-foreground text-[10px] uppercase tracking-wide">
													Total Cost
												</p>
												<p className="font-mono text-sm">
													{formatCost(totalCost)}
												</p>
											</div>
										</div>
									</CardContent>
								</Card>
							);
						})}
					</div>
				</section>

				{/* Support Banner */}
				<div className="mt-12 p-5 rounded-xl bg-linear-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-500/20">
					<div className="flex flex-col sm:flex-row items-center gap-4">
						<div className="p-2.5 rounded-lg bg-amber-500/20">
							<Coffee className="size-5 text-amber-600 dark:text-amber-400" weight="duotone" />
						</div>
						<div className="flex-1 text-center sm:text-left">
							<p className="text-sm text-foreground">
								Running benchmarks isn&apos;t cheap.{" "}
								<span className="text-muted-foreground">
									If you find this useful and want to support the project, consider buying me a coffee.
								</span>
							</p>
						</div>
						<a
							href="https://buymeacoffee.com/mauricekleine"
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium transition-colors"
						>
							<Heart className="size-4" weight="fill" />
							<span>Support</span>
						</a>
					</div>
				</div>

				{/* Footer */}
				<footer className="mt-8 pt-8 border-t border-border">
					<div className="flex flex-col sm:flex-row items-center justify-between gap-4">
						<p className="text-xs text-muted-foreground">
							NonoBench - Nonogram Puzzle Benchmark for LLMs
						</p>
						<div className="flex items-center gap-4">
							<a
								href="https://github.com/mauricekleine/nono-bench"
								target="_blank"
								rel="noopener noreferrer"
								className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
							>
								<GithubLogo className="size-4" weight="bold" />
								<span>GitHub</span>
							</a>
							<a
								href="https://x.com/maurice_kleine"
								target="_blank"
								rel="noopener noreferrer"
								className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
							>
								<XLogo className="size-4" weight="bold" />
								<span>@maurice_kleine</span>
							</a>
						</div>
					</div>
				</footer>
			</div>
		</div>
	);
}
