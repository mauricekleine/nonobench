# NonoBench

A benchmark suite for evaluating LLM reasoning capabilities on Nonogram (Picross) puzzle solving across different grid sizes.

## What is a Nonogram?

Nonograms (also known as Picross, Griddlers, or Paint by Numbers) are logic puzzles where you fill in cells on a grid based on numeric clues for each row and column. The clues indicate consecutive groups of filled cells, separated by at least one empty cell. Solving these puzzles requires logical deduction and constraint satisfaction - making them an excellent test of LLM reasoning abilities.

## Project Structure

```
nonobench/
├── bench/          # Benchmark runner for testing LLMs
├── data/           # Puzzle datasets and extraction scripts
└── visualizer/     # Next.js dashboard for results visualization
```

## Prerequisites

- [Bun](https://bun.sh) runtime (v1.0+)
- [Node.js](https://nodejs.org) v24+ (for the visualizer)
- [OpenRouter](https://openrouter.ai) API key

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/mauricekleine/nono-bench.git
cd nono-bench
```

### 2. Set Up Environment Variables

Create a `.env` file in the `bench/` directory:

```bash
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

### 3. Running Benchmarks

```bash
cd bench
bun install
bun run bench
```

This will test configured LLM models against Nonogram puzzles and save results to a SQLite database. After benchmarking, export results to JSON:

```bash
bun run export
```

### 4. Viewing Results

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

- **Multi-model benchmarking** - Compare performance across 35+ LLM configurations
- **Grid size analysis** - Evaluate accuracy on 5x5, 10x10, and 15x15 puzzles
- **Reasoning mode support** - Test models with and without extended thinking
- **Cost tracking** - Monitor token usage and API costs per model
- **Parallel execution** - Run multiple puzzles concurrently per model
- **Incremental runs** - Skip recently benchmarked puzzles (configurable threshold)
- **Interactive visualization** - Filter and explore results with charts and tables

## Supported Models

The benchmark currently supports models from:

| Provider | Models |
|----------|--------|
| Anthropic | Claude 4.5 Opus, Claude 4.5 Sonnet |
| OpenAI | GPT-5.2, GPT-OSS-120B |
| Google | Gemini 3 Flash Preview, Gemini 3 Pro Preview |
| DeepSeek | DeepSeek V3.2, DeepSeek V3.2 Speciale |
| xAI | Grok 4, Grok 4.1 Fast |
| Moonshot | Kimi K2, Kimi K2.5 |
| ByteDance | Seed 1.6, Seed 1.6 Flash |
| MiniMax | MiniMax M2.1 |
| Mistral | Mistral Large, Ministral 14B |
| Qwen | Qwen3-Next-80B |
| Z.AI | GLM 4.7 |
| Xiaomi | MiMo V2 Flash |
| AllenAI | OLMo 3.1 32B Think |

Many models are tested with different reasoning effort levels (low, high, xhigh).

## Puzzle Data

The puzzle datasets are sourced from [NonoDataset](https://github.com/josebambu/NonoDataset).

### Setting Up Puzzles

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

| Directory | Description |
|-----------|-------------|
| `5x5/` | Small puzzles for baseline testing |
| `10x10/` | Medium difficulty puzzles |
| `15x15/` | Challenging puzzles for advanced evaluation |
| `images/` | Visual representations of puzzles |

Python scripts are included in `data/` for extracting and inspecting puzzles.

## Configuration

Edit `bench/constants.ts` to configure:

- `RERUN_THRESHOLD_DAYS` - Days before re-benchmarking a puzzle (default: 90)
- `MAX_PARALLEL_RUNS_PER_MODEL` - Concurrent puzzle runs per model (default: 10)
- `MODELS` - Array of model configurations to benchmark

## Tech Stack

**Benchmark Runner**
- [Bun](https://bun.sh) - JavaScript runtime
- [AI SDK](https://sdk.vercel.ai) - Unified LLM interface
- [OpenRouter](https://openrouter.ai) - LLM API gateway
- TypeScript

**Visualizer**
- [Next.js 16](https://nextjs.org) - React framework
- [React 19](https://react.dev) - UI library
- [Tailwind CSS 4](https://tailwindcss.com) - Styling
- [shadcn/ui](https://ui.shadcn.com) - Component library
- [Recharts](https://recharts.org) - Charts
- [Zustand](https://zustand.docs.pmnd.rs) - State management

## Contributing

Contributions are welcome! Feel free to:

- Add support for new LLM models
- Improve the benchmark methodology
- Enhance the visualization dashboard
- Add new puzzle sizes or formats

## License

MIT
