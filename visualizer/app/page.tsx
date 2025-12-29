"use client";

import {
	CaretDown,
	ChartBar,
	GithubLogo,
	GridFour,
	Info,
	Question,
	Warning,
	XLogo,
} from "@phosphor-icons/react";
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
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
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

import resultsData from "./results.json";

type SizeData = {
	size: string;
	accuracy: number;
	correct: number;
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
	overallTotal: number;
	bySize: SizeData[];
};

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
	const minLightness = 0.45;
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

function ModelAccordionItem({
	modelData,
	rank,
	totalModels,
}: { modelData: ModelData; rank: number; totalModels: number }) {
	const totalDuration = modelData.bySize.reduce(
		(sum, s) => sum + s.avgDurationMs * s.total,
		0,
	);
	const totalPuzzles = modelData.overallTotal;
	const avgDuration = totalDuration / totalPuzzles;
	const totalCost = modelData.bySize.reduce((sum, s) => sum + s.totalCost, 0);
	const totalTokens = modelData.bySize.reduce(
		(sum, s) => sum + s.totalTokens,
		0,
	);

	return (
		<AccordionItem value={modelData.model} className="border-b border-border last:border-b-0">
			<AccordionTrigger className="hover:no-underline cursor-pointer px-4 py-3">
				<div className="flex items-center gap-3 flex-1">
					<div
						className="w-3 h-3 rounded-full shrink-0"
						style={{
							background: getRankColor(rank, totalModels),
						}}
					/>
					<span className="font-medium text-sm">
						{formatModelName(modelData.model)}
					</span>
					<div className="flex items-center gap-4 ml-auto mr-4">
						{/* Desktop: show stats inline */}
						<div className="hidden md:flex items-center gap-4 text-xs text-muted-foreground">
							<span><span className="font-mono">{formatDuration(avgDuration)}</span> <span className="opacity-60">avg</span></span>
							<span><span className="font-mono">{formatCost(totalCost)}</span> <span className="opacity-60">total</span></span>
						</div>
						<span className="text-xs text-muted-foreground hidden sm:inline">
							{modelData.overallCorrect}/{modelData.overallTotal} solved
						</span>
						<span className="font-mono text-sm font-bold text-primary">
							{(modelData.overallAccuracy * 100).toFixed(1)}%
						</span>
					</div>
				</div>
			</AccordionTrigger>
			<AccordionContent className="px-4">
				<div className="pt-2 pb-2 space-y-4">
					{/* Mobile: show stats in accordion content */}
					<div className="grid grid-cols-3 gap-4 md:hidden">
						<div>
							<p className="text-muted-foreground text-[10px] uppercase tracking-wide">
								Avg Time
							</p>
							<p className="font-mono text-sm">{formatDuration(avgDuration)}</p>
						</div>
						<div>
							<p className="text-muted-foreground text-[10px] uppercase tracking-wide">
								Total Cost
							</p>
							<p className="font-mono text-sm">{formatCost(totalCost)}</p>
						</div>
						<div>
							<p className="text-muted-foreground text-[10px] uppercase tracking-wide">
								Tokens
							</p>
							<p className="font-mono text-sm">{totalTokens.toLocaleString()}</p>
						</div>
					</div>

					<div className="pt-3 md:pt-0 border-t md:border-t-0 border-border">
						<p className="text-muted-foreground text-[10px] uppercase tracking-wide mb-2">
							By Grid Size
						</p>
						<div className="space-y-2">
							{modelData.bySize.map((sizeData) => (
								<div
									key={sizeData.size}
									className="flex items-center justify-between"
								>
									<span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
										{sizeData.size}
									</span>
									<div className="flex items-center gap-3">
										<span className="text-xs text-muted-foreground">
											{sizeData.correct}/{sizeData.total}
										</span>
										<span className="font-mono text-sm font-medium w-12 text-right">
											{(sizeData.accuracy * 100).toFixed(0)}%
										</span>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			</AccordionContent>
		</AccordionItem>
	);
}

export default function Page() {
	const [selectedSize, setSelectedSize] = useState<string>("all");
	const [aboutOpen, setAboutOpen] = useState(false);

	const sizes = useMemo(() => ["all", ...results.summary.sizes], []);

	// Detect empty data state
	const isEmptyData = useMemo(() => {
		return results.byModel.every((m) => m.overallAccuracy === 0);
	}, []);

	const chartData = useMemo(() => {
		const getModelStats = (model: ModelData) => {
			if (selectedSize === "all") {
				const totalDuration = model.bySize.reduce(
					(sum, s) => sum + s.avgDurationMs * s.total,
					0,
				);
				const totalCost = model.bySize.reduce(
					(sum, s) => sum + s.totalCost,
					0,
				);
				return {
					model: model.model,
					displayName: formatModelName(model.model),
					accuracy: model.overallAccuracy * 100,
					correct: model.overallCorrect,
					total: model.overallTotal,
					avgDuration: totalDuration / model.overallTotal,
					totalCost,
				};
			}

			const sizeData = model.bySize.find((s) => s.size === selectedSize);
			return {
				model: model.model,
				displayName: formatModelName(model.model),
				accuracy: (sizeData?.accuracy ?? 0) * 100,
				correct: sizeData?.correct ?? 0,
				total: sizeData?.total ?? 0,
				avgDuration: sizeData?.avgDurationMs ?? 0,
				totalCost: sizeData?.totalCost ?? 0,
			};
		};

		const data = results.byModel.map((model) => getModelStats(model));

		// Sort by accuracy (highest first), then assign colors based on rank
		const sorted = data.sort((a, b) => b.accuracy - a.accuracy);
		return sorted.map((item, rank) => ({
			...item,
			fill: getRankColor(rank, sorted.length),
		}));
	}, [selectedSize]);

	const sortedModels = useMemo(() => {
		return [...results.byModel].sort(
			(a, b) => b.overallAccuracy - a.overallAccuracy,
		);
	}, []);

	return (
		<div className="min-h-screen bg-background">
			{/* Grid pattern background for Nonogram theme */}
			<div className="fixed inset-0 grid-pattern pointer-events-none" />
			{/* Subtle gradient background */}
			<div className="fixed inset-0 bg-linear-to-br from-primary/5 via-transparent to-chart-2/5 pointer-events-none" />

			<div className="relative max-w-7xl mx-auto px-6 py-12">
				{/* Header */}
				<header className="mb-8">
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
					<p className="text-xs text-muted-foreground/60 mt-2 font-mono">
						Last updated: {new Date(results.timestamp).toLocaleString()}
					</p>

					{/* Collapsible About Section */}
					<Collapsible open={aboutOpen} onOpenChange={setAboutOpen}>
						<CollapsibleTrigger className="flex items-center gap-2 mt-4 text-xs text-muted-foreground hover:text-foreground transition-colors">
							<Question className="size-4" weight="bold" />
							<span>What are Nonograms?</span>
							<CaretDown
								className={`size-3 transition-transform ${aboutOpen ? "rotate-180" : ""}`}
							/>
						</CollapsibleTrigger>
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
												formatter={(value, name, props) => (
													<div className="flex flex-col gap-1">
														<span className="font-medium">
															{props.payload.displayName}
														</span>
														<span>
															Accuracy:{" "}
															<span className="font-mono font-bold">
																{Number(value).toFixed(1)}%
															</span>
														</span>
														<span className="text-muted-foreground">
															{props.payload.correct}/{props.payload.total}{" "}
															puzzles solved
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

				{/* Per-Model Stats (Accordion) */}
				<section>
					<h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
						Detailed Model Statistics
					</h2>
					<Accordion className="border-none">
						{sortedModels.map((modelData, index) => (
							<ModelAccordionItem
								key={modelData.model}
								modelData={modelData}
								rank={index}
								totalModels={sortedModels.length}
							/>
						))}
					</Accordion>
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
													{(avgAccuracy * 100).toFixed(1)}%
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

				{/* Footer */}
				<footer className="mt-16 pt-8 border-t border-border">
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
