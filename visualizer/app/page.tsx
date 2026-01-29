"use client";

import {
	Brain,
	CaretDown,
	CaretUp,
	CaretUpDown,
	ChartBar,
	DownloadSimple,
	GithubLogo,
	GridFour,
	Info,
	Lightning,
	Question,
	Robot,
	Rows,
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
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

import resultsData from "./results.json";
import resultsRawData from "./results-raw.json";
import { PUZZLES } from "@/components/puzzles";

type SizeData = {
	size: string;
	accuracy: number;
	correct: number;
	failed: number;
	total: number;
	runs?: number; // Added: successful runs (excluding failed)
	avgDurationMs: number;
	totalDurationMs?: number; // Added: total duration for successful runs
	avgTokens: number;
	totalTokens: number;
	avgCost: number;
	totalCost: number;
};

type ModelData = {
	model: string;
	reasoning?: boolean; // Whether this is a reasoning model (optional for backward compatibility)
	overallAccuracy: number;
	overallCorrect: number;
	overallFailed: number;
	overallTotal: number;
	overallRuns?: number; // Added: total successful runs (excluding failed)
	bySize: SizeData[];
};

type ErrorMessageData = {
	message: string;
	count: number;
};

type ModelErrorData = {
	model: string;
	totalErrors: number;
	errors: ErrorMessageData[];
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
	errorsByModel?: ModelErrorData[];
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

// Helper to get runs for a size (uses new field or calculates from total - failed)
function getSizeRuns(sizeData: SizeData): number {
	return sizeData.runs ?? (sizeData.total - sizeData.failed);
}

// Helper to get total duration for a size (uses new field or estimates from avg * runs)
function getSizeTotalDuration(sizeData: SizeData): number {
	if (sizeData.totalDurationMs !== undefined) return sizeData.totalDurationMs;
	const runs = getSizeRuns(sizeData);
	return sizeData.avgDurationMs * runs;
}

// Helper to get overall runs (uses new field or calculates from total - failed)
function getModelRuns(modelData: ModelData): number {
	return modelData.overallRuns ?? (modelData.overallTotal - modelData.overallFailed);
}

// Helper to get accuracy for a specific size
function getAccuracyForSize(modelData: ModelData, size: string): number {
	const sizeData = modelData.bySize.find((s) => s.size === size);
	return sizeData?.accuracy ?? 0;
}

// Helper to get stats for a specific size
function getSizeStats(modelData: ModelData, size: string) {
	const sizeData = modelData.bySize.find((s) => s.size === size);
	if (!sizeData) return { accuracy: 0, correct: 0, runs: 0, failed: 0, avgCost: 0, avgTime: 0 };
	return {
		accuracy: sizeData.accuracy,
		correct: sizeData.correct,
		runs: getSizeRuns(sizeData),
		failed: sizeData.failed,
		avgCost: sizeData.avgCost,
		avgTime: sizeData.avgDurationMs,
	};
}

// Helper to get model stats
function getModelStats(modelData: ModelData) {
	const totalDuration = modelData.bySize.reduce((sum, s) => sum + getSizeTotalDuration(s), 0);
	const totalCost = modelData.bySize.reduce((sum, s) => sum + s.totalCost, 0);
	const runs = getModelRuns(modelData);
	const avgDuration = runs > 0 ? totalDuration / runs : 0;
	const avgCost = runs > 0 ? totalCost / runs : 0;

	return {
		avgDuration,
		totalDuration,
		totalCost,
		avgCost,
		totalFailed: modelData.overallFailed,
		runs,
		correct: modelData.overallCorrect,
		accuracy: modelData.overallAccuracy,
	};
}

export default function Page() {
	const [selectedSize, setSelectedSize] = useState<string>("all");
	const [aboutOpen, setAboutOpen] = useState(false);
	const [sortColumn, setSortColumn] = useState<SortColumn>("accuracy");
	const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
	const [showReasoning, setShowReasoning] = useState(true);
	const [showNonReasoning, setShowNonReasoning] = useState(true);

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

	// Filter models based on reasoning checkboxes
	const filteredModels = useMemo(() => {
		return results.byModel.filter((model) => {
			const isReasoning = model.reasoning ?? false;
			if (isReasoning && !showReasoning) return false;
			if (!isReasoning && !showNonReasoning) return false;
			return true;
		});
	}, [showReasoning, showNonReasoning]);

	const chartData = useMemo(() => {
		const getChartModelStats = (model: ModelData) => {
			if (selectedSize === "all") {
				const totalDuration = model.bySize.reduce((sum, s) => sum + getSizeTotalDuration(s), 0);
				const totalCost = model.bySize.reduce((sum, s) => sum + s.totalCost, 0);
				const runs = getModelRuns(model);
				return {
					model: model.model,
					displayName: formatModelName(model.model),
					accuracy: model.overallAccuracy,
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
			return {
				model: model.model,
				displayName: formatModelName(model.model),
				accuracy: sizeData.accuracy,
				correct: sizeData.correct,
				total: getSizeRuns(sizeData),
				avgDuration: sizeData.avgDurationMs,
				totalCost: sizeData.totalCost,
			};
		};

		const data = filteredModels.map((model) => getChartModelStats(model));

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
	}, [selectedSize, filteredModels]);

	const sortedModels = useMemo(() => {
		return [...filteredModels].sort((a, b) => {
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
	}, [sortColumn, sortDirection, filteredModels]);

	// Calculate max accuracy for each size column (for highlighting)
	const maxAccuracyBySize = useMemo(() => {
		const sizes = ["5x5", "10x10", "15x15"] as const;
		const maxValues: Record<string, number> = {};

		for (const size of sizes) {
			maxValues[size] = Math.max(
				0, // Ensure at least 0 if filteredModels is empty
				...filteredModels.map((model) => getAccuracyForSize(model, size))
			);
		}

		return maxValues;
	}, [filteredModels]);

	// Calculate benchmark stats
	const benchmarkStats = useMemo(() => {
		const totalModels = filteredModels.length;
		const puzzlesPerModel = PUZZLES.length;
		const totalRuns = filteredModels.reduce((sum, model) => sum + getModelRuns(model), 0);
		return { totalModels, totalPuzzles: puzzlesPerModel, totalRuns };
	}, [filteredModels]);

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

							<DropdownMenu>
								<DropdownMenuTrigger className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted border border-border rounded-full transition-all cursor-pointer whitespace-nowrap">
									<DownloadSimple className="size-4" weight="bold" />
									<span>Download Results</span>
									<CaretDown className="size-3" />
								</DropdownMenuTrigger>
								<DropdownMenuContent className="w-fit" align="start">
									<DropdownMenuItem
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
									>
										Download Aggregated Results
									</DropdownMenuItem>
									<DropdownMenuItem
										onClick={() => {
											const blob = new Blob([JSON.stringify(resultsRawData, null, 2)], {
												type: "application/json",
											});
											const url = URL.createObjectURL(blob);
											const a = document.createElement("a");
											a.href = url;
											a.download = "nonobench-results-raw.json";
											a.click();
											URL.revokeObjectURL(url);
										}}
									>
										Download Raw Results
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
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

				{/* Model type filters */}
				<div className="flex items-center gap-4 my-4 p-3 rounded-lg bg-muted/30 border border-border">
					<span className="text-xs text-muted-foreground font-medium">Filter by model type:</span>
					<div className="flex items-center gap-2">
						<Checkbox
							id="reasoning"
							checked={showReasoning}
							onCheckedChange={(checked) => setShowReasoning(checked === true)}
						/>
						<Label htmlFor="reasoning" className="text-xs cursor-pointer flex items-center gap-1.5">
							Reasoning models
						</Label>
					</div>
					<div className="flex items-center gap-2">
						<Checkbox
							id="non-reasoning"
							checked={showNonReasoning}
							onCheckedChange={(checked) => setShowNonReasoning(checked === true)}
						/>
						<Label htmlFor="non-reasoning" className="text-xs cursor-pointer">
							Non-reasoning models
						</Label>
					</div>
				</div>

				{/* Main Chart */}
				<section className="mb-10">
					<Card className="pb-0">
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
										modal={false}
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
							<div className="overflow-x-auto -mx-6 px-6 pb-6">
								<ChartContainer
									config={chartConfig}
									className="h-[400px]"
									style={{ minWidth: `${Math.max(500, chartData.length * 52)}px` }}
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
							</div>
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
									{/* Group header row */}
									<tr className="border-b border-border bg-muted/30">
										<th
											rowSpan={2}
											className="sticky w-48 max-w-48 sm:max-w-fit sm:w-fit left-0 bg-muted/30 backdrop-blur-sm text-left font-medium px-4 py-3 border-r border-border align-bottom"
										>
											Model
										</th>
										<th
											rowSpan={2}
											className="text-left font-medium px-4 py-3 whitespace-nowrap cursor-pointer hover:bg-muted/50 transition-colors select-none align-bottom border-r border-border/50"
											onClick={() => handleSort("accuracy")}
										>
											<div className="flex items-center gap-1">
												Overall
												{getSortIcon("accuracy")}
											</div>
										</th>
										<th
											colSpan={5}
											className="text-center font-medium px-4 py-2 whitespace-nowrap border-r border-border/50 bg-blue-500/10"
										>
											5×5
										</th>
										<th
											colSpan={5}
											className="text-center font-medium px-4 py-2 whitespace-nowrap border-r border-border/50 bg-emerald-500/10"
										>
											10×10
										</th>
										<th
											colSpan={5}
											className="text-center font-medium px-4 py-2 whitespace-nowrap bg-amber-500/10"
										>
											15×15
										</th>
									</tr>
									{/* Sub-header row */}
									<tr className="border-b border-border bg-muted/20 text-xs">
										{/* 5×5 columns */}
										<th className="text-left font-medium px-3 py-2 whitespace-nowrap bg-blue-500/5">Accuracy</th>
										<th className="text-left font-medium px-3 py-2 whitespace-nowrap bg-blue-500/5">Runs</th>
										<th className="text-left font-medium px-3 py-2 whitespace-nowrap bg-blue-500/5">Correct</th>
										<th className="text-left font-medium px-3 py-2 whitespace-nowrap bg-blue-500/5">Avg Cost</th>
										<th className="text-left font-medium px-3 py-2 whitespace-nowrap bg-blue-500/5 border-r border-border/50">Avg Time</th>
										{/* 10×10 columns */}
										<th className="text-left font-medium px-3 py-2 whitespace-nowrap bg-emerald-500/5">Accuracy</th>
										<th className="text-left font-medium px-3 py-2 whitespace-nowrap bg-emerald-500/5">Runs</th>
										<th className="text-left font-medium px-3 py-2 whitespace-nowrap bg-emerald-500/5">Correct</th>
										<th className="text-left font-medium px-3 py-2 whitespace-nowrap bg-emerald-500/5">Avg Cost</th>
										<th className="text-left font-medium px-3 py-2 whitespace-nowrap bg-emerald-500/5 border-r border-border/50">Avg Time</th>
										{/* 15×15 columns */}
										<th className="text-left font-medium px-3 py-2 whitespace-nowrap bg-amber-500/5">Accuracy</th>
										<th className="text-left font-medium px-3 py-2 whitespace-nowrap bg-amber-500/5">Runs</th>
										<th className="text-left font-medium px-3 py-2 whitespace-nowrap bg-amber-500/5">Correct</th>
										<th className="text-left font-medium px-3 py-2 whitespace-nowrap bg-amber-500/5">Avg Cost</th>
										<th className="text-left font-medium px-3 py-2 whitespace-nowrap bg-amber-500/5">Avg Time</th>
									</tr>
								</thead>
								<tbody>
									{sortedModels.map((modelData, index) => {
										const stats = getModelStats(modelData);
										const stats5x5 = getSizeStats(modelData, "5x5");
										const stats10x10 = getSizeStats(modelData, "10x10");
										const stats15x15 = getSizeStats(modelData, "15x15");
										const rowColor = getRankColor(index, sortedModels.length);

										const renderAccuracyCell = (sizeStats: ReturnType<typeof getSizeStats>, size: string, bgClass: string) => {
											const isMax = sizeStats.accuracy > 0 && sizeStats.accuracy === maxAccuracyBySize[size];
											return (
												<td className={`text-left px-3 py-3 ${bgClass}`}>
													<span
														className="font-mono text-muted-foreground"
														style={isMax ? {
															textDecoration: "underline",
															textDecorationColor: rowColor,
															textUnderlineOffset: "3px",
															textDecorationThickness: "2px",
														} : undefined}
													>
														{sizeStats.accuracy.toFixed(0)}%
													</span>
												</td>
											);
										};

										return (
											<tr
												key={modelData.model}
												className="border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors"
											>
												<td className="sticky w-48 max-w-48 sm:max-w-fit sm:w-fit left-0 bg-card/30 backdrop-blur-sm px-4 py-3 border-r border-border">
													<div className="flex items-center gap-2">
														<div
															className="w-2.5 h-2.5 mt-0.5 rounded-full shrink-0"
															style={{ background: rowColor }}
														/>
														<span className="font-medium truncate">
															{formatModelName(modelData.model)}
														</span>
														{modelData.reasoning && (
															<Tooltip>
																<TooltipTrigger>
																	<Brain className="size-3.5 text-primary shrink-0" weight="duotone" />
																</TooltipTrigger>
																<TooltipContent>
																	<p>Reasoning model</p>
																</TooltipContent>
															</Tooltip>
														)}
													</div>
												</td>
												<td className="text-left px-4 py-3 border-r border-border/50">
													<span className="font-mono font-bold" style={{ color: rowColor }}>
														{stats.accuracy.toFixed(1)}%
													</span>
												</td>
												{/* 5×5 columns */}
												{renderAccuracyCell(stats5x5, "5x5", "bg-blue-500/5")}
												<td className="text-left px-3 py-3 bg-blue-500/5">
													<span className="font-mono text-muted-foreground text-xs">{stats5x5.runs}</span>
												</td>
												<td className="text-left px-3 py-3 bg-blue-500/5">
													<span className="font-mono text-muted-foreground text-xs">{stats5x5.correct}</span>
												</td>
												<td className="text-left px-3 py-3 bg-blue-500/5">
													<span className="font-mono text-muted-foreground text-xs">{formatCost(stats5x5.avgCost)}</span>
												</td>
												<td className="text-left px-3 py-3 bg-blue-500/5 border-r border-border/50">
													<span className="font-mono text-muted-foreground text-xs">{formatDuration(stats5x5.avgTime)}</span>
												</td>
												{/* 10×10 columns */}
												{renderAccuracyCell(stats10x10, "10x10", "bg-emerald-500/5")}
												<td className="text-left px-3 py-3 bg-emerald-500/5">
													<span className="font-mono text-muted-foreground text-xs">{stats10x10.runs}</span>
												</td>
												<td className="text-left px-3 py-3 bg-emerald-500/5">
													<span className="font-mono text-muted-foreground text-xs">{stats10x10.correct}</span>
												</td>
												<td className="text-left px-3 py-3 bg-emerald-500/5">
													<span className="font-mono text-muted-foreground text-xs">{formatCost(stats10x10.avgCost)}</span>
												</td>
												<td className="text-left px-3 py-3 bg-emerald-500/5 border-r border-border/50">
													<span className="font-mono text-muted-foreground text-xs">{formatDuration(stats10x10.avgTime)}</span>
												</td>
												{/* 15×15 columns */}
												{renderAccuracyCell(stats15x15, "15x15", "bg-amber-500/5")}
												<td className="text-left px-3 py-3 bg-amber-500/5">
													<span className="font-mono text-muted-foreground text-xs">{stats15x15.runs}</span>
												</td>
												<td className="text-left px-3 py-3 bg-amber-500/5">
													<span className="font-mono text-muted-foreground text-xs">{stats15x15.correct}</span>
												</td>
												<td className="text-left px-3 py-3 bg-amber-500/5">
													<span className="font-mono text-muted-foreground text-xs">{formatCost(stats15x15.avgCost)}</span>
												</td>
												<td className="text-left px-3 py-3 bg-amber-500/5">
													<span className="font-mono text-muted-foreground text-xs">{formatDuration(stats15x15.avgTime)}</span>
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
							// Filter chartData to only include models that pass the reasoning filter
							const filteredModelNames = new Set(filteredModels.map((m) => m.model));
							const sizeStats = results.chartData.filter(
								(d) => d.size === size && filteredModelNames.has(d.model),
							);
							const totalCorrect = sizeStats.reduce(
								(sum, s) => sum + s.correct,
								0,
							);
							const totalRuns = sizeStats.reduce(
								(sum, s) => sum + getSizeRuns(s),
								0,
							);
							const avgAccuracy = totalRuns > 0 ? (totalCorrect / totalRuns) * 100 : 0;
							const totalDuration = sizeStats.reduce(
								(sum, s) => sum + getSizeTotalDuration(s),
								0,
							);
							const avgDuration = totalRuns > 0 ? totalDuration / totalRuns : 0;
							const totalCost = sizeStats.reduce(
								(sum, s) => sum + s.totalCost,
								0,
							);
							const avgCost = totalRuns > 0 ? totalCost / totalRuns : 0;

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
														/{totalRuns}
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
													Avg Cost
												</p>
												<p className="font-mono text-sm">
													{formatCost(avgCost)}
												</p>
											</div>
										</div>
									</CardContent>
								</Card>
							);
						})}
					</div>
				</section>

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
