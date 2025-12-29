"use client";

import {
	ChartBar,
	CurrencyDollar,
	GridFour,
	Hash,
	Target,
	Timer,
	Trophy,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
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

const MODEL_COLORS = [
	"oklch(0.75 0.18 160)", // emerald
	"oklch(0.70 0.20 280)", // purple
	"oklch(0.80 0.15 60)", // amber
	"oklch(0.65 0.22 200)", // cyan
	"oklch(0.70 0.18 340)", // rose
	"oklch(0.72 0.16 120)", // lime
	"oklch(0.68 0.19 30)", // orange
	"oklch(0.65 0.20 250)", // indigo
];

function formatModelName(name: string): string {
	return name
		.replace(/-/g, " ")
		.replace(/\b\w/g, (l) => l.toUpperCase())
		.replace(/(\d)/g, " $1")
		.trim();
}

function formatDuration(ms: number): string {
	if (ms < 1000) return `${Math.round(ms)}ms`;
	return `${(ms / 1000).toFixed(2)}s`;
}

function formatCost(cost: number): string {
	if (cost < 0.01) return `$${cost.toFixed(4)}`;
	return `$${cost.toFixed(2)}`;
}

function StatCard({
	icon: Icon,
	label,
	value,
	subValue,
	accent = false,
}: {
	icon: React.ElementType;
	label: string;
	value: string | number;
	subValue?: string;
	accent?: boolean;
}) {
	return (
		<Card className={accent ? "ring-primary/30 ring-2" : ""}>
			<CardContent className="pt-4">
				<div className="flex items-start gap-3">
					<div
						className={`p-2 rounded-lg ${accent ? "bg-primary/20" : "bg-muted"}`}
					>
						<Icon
							className={`size-4 ${accent ? "text-primary" : "text-muted-foreground"}`}
							weight="bold"
						/>
					</div>
					<div className="flex-1 min-w-0">
						<p className="text-muted-foreground text-xs truncate">{label}</p>
						<p
							className={`font-mono text-lg font-semibold ${accent ? "text-primary" : ""}`}
						>
							{value}
						</p>
						{subValue && (
							<p className="text-muted-foreground text-xs">{subValue}</p>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

function ModelStatsCard({ modelData }: { modelData: ModelData }) {
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
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="flex items-center gap-2">
					<div
						className="w-3 h-3 rounded-full"
						style={{
							background:
								MODEL_COLORS[
									results.byModel.findIndex((m) => m.model === modelData.model)
								] || MODEL_COLORS[0],
						}}
					/>
					{formatModelName(modelData.model)}
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-2 gap-4 mb-4">
					<div>
						<p className="text-muted-foreground text-xs">Overall Accuracy</p>
						<p className="font-mono text-2xl font-bold text-primary">
							{(modelData.overallAccuracy * 100).toFixed(1)}%
						</p>
					</div>
					<div>
						<p className="text-muted-foreground text-xs">Puzzles Solved</p>
						<p className="font-mono text-2xl font-bold">
							{modelData.overallCorrect}
							<span className="text-muted-foreground text-sm">
								/{modelData.overallTotal}
							</span>
						</p>
					</div>
				</div>

				<div className="grid grid-cols-3 gap-3 pt-3 border-t border-border">
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

				<div className="mt-4 pt-3 border-t border-border">
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
			</CardContent>
		</Card>
	);
}

export default function Page() {
	const [selectedSize, setSelectedSize] = useState<string>("all");

	const sizes = useMemo(() => ["all", ...results.summary.sizes], []);

	const chartData = useMemo(() => {
		if (selectedSize === "all") {
			return results.byModel
				.map((model, index) => ({
					model: model.model,
					displayName: formatModelName(model.model),
					accuracy: model.overallAccuracy * 100,
					correct: model.overallCorrect,
					total: model.overallTotal,
					fill: MODEL_COLORS[index % MODEL_COLORS.length],
				}))
				.sort((a, b) => b.accuracy - a.accuracy);
		}

		return results.byModel
			.map((model, index) => {
				const sizeData = model.bySize.find((s) => s.size === selectedSize);
				return {
					model: model.model,
					displayName: formatModelName(model.model),
					accuracy: (sizeData?.accuracy ?? 0) * 100,
					correct: sizeData?.correct ?? 0,
					total: sizeData?.total ?? 0,
					fill: MODEL_COLORS[index % MODEL_COLORS.length],
				};
			})
			.sort((a, b) => b.accuracy - a.accuracy);
	}, [selectedSize]);

	const overallStats = useMemo(() => {
		const totalPuzzles = results.byModel.reduce(
			(sum, m) => sum + m.overallTotal,
			0,
		);
		const totalCorrect = results.byModel.reduce(
			(sum, m) => sum + m.overallCorrect,
			0,
		);
		const totalCost = results.chartData.reduce(
			(sum, d) => sum + d.totalCost,
			0,
		);
		const totalTokens = results.chartData.reduce(
			(sum, d) => sum + d.totalTokens,
			0,
		);
		const avgDuration =
			results.chartData.reduce((sum, d) => sum + d.avgDurationMs * d.total, 0) /
			totalPuzzles;

		const bestModel =
			[...results.byModel].sort(
				(a, b) => b.overallAccuracy - a.overallAccuracy,
			)[0]?.model ?? "N/A";

		return {
			totalPuzzles,
			totalCorrect,
			totalCost,
			totalTokens,
			avgDuration,
			bestModel,
			modelCount: results.byModel.length,
		};
	}, []);

	return (
		<div className="min-h-screen bg-background">
			{/* Subtle gradient background */}
			<div className="fixed inset-0 bg-gradient-to-br from-primary/5 via-transparent to-chart-2/5 pointer-events-none" />

			<div className="relative max-w-7xl mx-auto px-6 py-12">
				{/* Header */}
				<header className="mb-12">
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
				</header>

				{/* Overview Stats */}
				<section className="mb-10">
					<h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
						Overview
					</h2>
					<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
						<StatCard
							icon={Trophy}
							label="Best Model"
							value={formatModelName(overallStats.bestModel)}
							accent
						/>
						<StatCard
							icon={ChartBar}
							label="Models Tested"
							value={overallStats.modelCount}
						/>
						<StatCard
							icon={Target}
							label="Total Puzzles"
							value={overallStats.totalPuzzles}
							subValue={`${overallStats.totalCorrect} solved`}
						/>
						<StatCard
							icon={Timer}
							label="Avg Response"
							value={formatDuration(overallStats.avgDuration)}
						/>
						<StatCard
							icon={Hash}
							label="Total Tokens"
							value={overallStats.totalTokens.toLocaleString()}
						/>
						<StatCard
							icon={CurrencyDollar}
							label="Total Cost"
							value={formatCost(overallStats.totalCost)}
						/>
					</div>
				</section>

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
									<p className="text-muted-foreground text-xs mt-1">
										Sorted by accuracy (highest to lowest)
									</p>
								</div>
								<div className="flex items-center gap-2">
									<span className="text-xs text-muted-foreground">
										Grid Size:
									</span>
									<Select value={selectedSize} onValueChange={setSelectedSize}>
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
							<ChartContainer config={chartConfig} className="h-[400px] w-full">
								<BarChart
									data={chartData}
									layout="vertical"
									margin={{ top: 20, right: 60, bottom: 20, left: 120 }}
								>
									<CartesianGrid
										horizontal={false}
										strokeDasharray="3 3"
										stroke="var(--border)"
									/>
									<XAxis
										type="number"
										domain={[0, 100]}
										tickFormatter={(v) => `${v}%`}
										axisLine={false}
										tickLine={false}
									/>
									<YAxis
										type="category"
										dataKey="displayName"
										axisLine={false}
										tickLine={false}
										width={110}
										tick={{ fontSize: 12 }}
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
									<Bar dataKey="accuracy" radius={[0, 4, 4, 0]}>
										{chartData.map((entry, index) => (
											<Cell key={`cell-${index}`} fill={entry.fill} />
										))}
										<LabelList
											dataKey="accuracy"
											position="right"
											formatter={(v: number) => `${v.toFixed(1)}%`}
											className="fill-foreground font-mono text-xs"
										/>
									</Bar>
								</BarChart>
							</ChartContainer>
						</CardContent>
					</Card>
				</section>

				{/* Per-Model Stats */}
				<section>
					<h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
						Detailed Model Statistics
					</h2>
					<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
						{results.byModel
							.sort((a, b) => b.overallAccuracy - a.overallAccuracy)
							.map((modelData) => (
								<ModelStatsCard key={modelData.model} modelData={modelData} />
							))}
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
				<footer className="mt-16 pt-8 border-t border-border text-center">
					<p className="text-xs text-muted-foreground">
						NonoBench - Nonogram Puzzle Benchmark for LLMs
					</p>
				</footer>
			</div>
		</div>
	);
}
