# NonoBench

A benchmark suite for evaluating LLM performance on Nonogram (Picross) puzzle solving across different grid sizes.

## Project Structure

```
nonobench/
├── bench/          # Benchmark runner for testing LLMs
├── data/           # Puzzle datasets (5x5, 10x10, 15x15)
└── visualizer/     # Next.js dashboard for results visualization
```

## Quick Start

### Running Benchmarks

```bash
cd bench
bun install
bun run index.ts
```

This will test configured LLM models against Nonogram puzzles and output results to `results.json`.

### Viewing Results

```bash
cd visualizer
bun install
bun run dev
```

Copy the benchmark results to the visualizer:

```bash
cp bench/results.json visualizer/app/results.json
```

Then open [http://localhost:3000](http://localhost:3000) to view the interactive dashboard.

## Features

- **Multi-model benchmarking**: Compare performance across different LLMs
- **Grid size analysis**: Evaluate accuracy on 5x5, 10x10, and 15x15 puzzles
- **Cost tracking**: Monitor token usage and API costs per model
- **Interactive visualization**: Filter results by grid size with beautiful charts

## Data

The puzzle datasets are sourced from [NonoDataset](https://github.com/josebambu/NonoDataset).

### Setup

1. Clone or download the dataset repository:

```bash
git clone https://github.com/josebambu/NonoDataset.git
```

2. Copy the puzzle folders into `data/`:

```bash
cp -r NonoDataset/5x5 data/
cp -r NonoDataset/10x10 data/
cp -r NonoDataset/15x15 data/
cp -r NonoDataset/images data/
```

### Dataset Structure

The `data/` directory contains Nonogram puzzle datasets in `.npz` format:

- `5x5/` - Small puzzles for baseline testing
- `10x10/` - Medium difficulty puzzles
- `15x15/` - Challenging puzzles for advanced evaluation
- `images/` - Visual representations of puzzles

## Tech Stack

- **Runtime**: [Bun](https://bun.sh)
- **Benchmark**: TypeScript with AI SDK
- **Visualizer**: Next.js 16 + Tailwind CSS + shadcn/ui + Recharts
