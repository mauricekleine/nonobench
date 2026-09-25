# Nonobench

A benchmark suite for evaluating LLM reasoning capabilities on Nonogram (Picross) puzzle solving across different grid sizes. Results are published at [nonobench.com](https://nonobench.com).

## What is a Nonogram?

Nonograms (also known as Picross, Griddlers, or Paint by Numbers) are logic puzzles where you fill in cells on a grid based on numeric clues for each row and column. The clues indicate consecutive groups of filled cells, separated by at least one empty cell. Solving these puzzles requires logical deduction and constraint satisfaction - making them an excellent test of LLM reasoning abilities.

## Project Structure

```
nonobench/
├── bench/          # Benchmark runner, results database and exporter
└── visualizer/     # Next.js dashboard (nonobench.com), also home of the puzzle set
```

## Prerequisites

- [Bun](https://bun.sh) runtime (v1.4+)
- [Node.js](https://nodejs.org) v24+ (for the visualizer)
- [OpenRouter](https://openrouter.ai) API key

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/mauricekleine/nonobench.git
cd nonobench
```

### 2. Set Up Environment Variables

Create a `.env` file in the `bench/` directory (see `bench/.env.example`):

```bash
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

This is the only variable needed. The visualizer builds without any.

### 3. Running Benchmarks

```bash
cd bench
bun install
bun run bench                       # prints the plan and exits, no API calls
bun run bench --model <name>        # run one model (repeat --model for more)
bun run bench --all-missing         # run every configured model with missing work
bun run bench --model <name> --sizes 20x20  # opt in to the extended tier
```

Runs are incremental and append-only: a model/puzzle pair that already has a successful result is never run again, and the database refuses to overwrite it. Failed runs are retried on the next invocation. Results are stored in `bench/results.db` (SQLite).

Useful flags:

- `--max-cost <usd>` stops launching new puzzles once this session's spend reaches the amount. Requests already in flight still finish, so a session can overshoot by up to `--parallel` requests per selected model. Use the OpenRouter key's own limit as the hard ceiling.
- `--parallel <n>` sets concurrent requests per model (default 10); lower it for rate-limited providers.
- `--limit <n>` runs only the first n puzzles of each size, for pilots against a scratch database (`NONOBENCH_DB=/tmp/copy.db`).

### Output modes

New runs ask for the answer as strict structured output (a JSON schema, only routed to endpoints that enforce it), so models cannot wrap the grid in prose. For a few models the schema-enforcing endpoints measurably hurt answers; those run in text mode instead (`outputMode: "text"` in `bench/constants.ts`, chosen by a 5x5 A/B with the benchmark prompt). Every run records its mode, and grading is identical for both: the answer must satisfy every clue. The runner also stops a model that solves none of the 5x5 puzzles with structured output, and one whose early runs mostly report zero reasoning tokens, since both point at the harness rather than the model.

After benchmarking, export results for the visualizer:

```bash
bun run export
```

This writes `visualizer/app/results.json` (aggregates) and `visualizer/public/results-raw.json` (every run, including prompts and outputs).

Other scripts:

- `bun test` - parser, grader, database-policy and puzzle checks
- `bun run typecheck` - TypeScript check
- `bun run regrade` - read-only comparison of stored grades against the current grader

### 4. Viewing Results

```bash
cd visualizer
bun install
bun run dev
```

Then open [http://localhost:3000](http://localhost:3000) to view the interactive dashboard.

## Agent Access

nonobench.com exposes the benchmark data to agents, with no authentication:

- **REST API** under `/api/v1` (leaderboard, models, puzzles, a solution checker, individual runs). The spec is at `/api/openapi.json`, and `/.well-known/api-catalog` (RFC 9727) points to it.
- **MCP server** at `/mcp` (stateless Streamable HTTP), described by `/.well-known/mcp/server-card.json`. Add it to a client with `claude mcp add --transport http nonobench https://www.nonobench.com/mcp`.
- **WebMCP** tools registered in the browser via `navigator.modelContext`.
- **Markdown**: `/` and `/puzzles` return markdown when requested with `Accept: text/markdown`. `/llms.txt` gives an overview.
- **Discovery**: `robots.txt` (with Content Signals), `sitemap.xml`, `Link` headers on the homepage, an agent skill at `/.well-known/agent-skills/index.json`, and an ARD manifest at `/.well-known/ai-catalog.json`.

All of it is read from the same exported files as the dashboard (`visualizer/app/results.json` and `visualizer/public/results-raw.json`), so `bun run export` updates it too.

## Grading

Each model receives the same system prompt and the puzzle's row and column clues, and must answer with the grid as a string of `1`s and `0`s. An answer is correct when it satisfies every row and column clue.

Ten of the 30 puzzles (one 5x5, four 10x10, five 15x15) have more than one valid solution, so answers are checked against the clues rather than compared with the stored solution. Correctness is derived from the stored raw outputs at export time; the database is never rewritten. The puzzle test suite pins which puzzles are ambiguous, and any new puzzle must have a unique solution.

## Puzzle Data

The core tier has 30 puzzles (10 each of 5x5, 10x10 and 15x15), defined in `visualizer/components/puzzles/` and shared by the runner and the dashboard. They were sourced from [nono-dataset](https://github.com/mauricekleine/nono-dataset). The extended tier has 10 generated 20x20 puzzles. A puzzle's ID is a hash of its solution, so changing a puzzle's solution creates a new puzzle.

## Tiers and generation

Default benchmark runs cover the three core sizes. Use `--sizes 20x20` with a model selection to run the extended tier; comma-separated sizes also work. The runner's plan reports missing 20x20 work separately. Headline overall accuracy and best-variant selection use core runs only; 20x20 has its own size results.

From `bench/`, `bun run generate-puzzles` recreates the 20x20 set with a fixed seed. It combines geometric shapes and symmetric motifs, filters for 45–65% filled cells and nonempty lines, then keeps only grids fully solved by repeated row and column placement propagation. The generator selects ten distinct puzzles across the measured first-pass difficulty range. `bun test` verifies their clues and line solvability; the original ambiguity list remains pinned.

## Configuration

Edit `bench/constants.ts` to configure:

- `MODELS` - Array of model configurations (OpenRouter model ID, display name, reasoning settings)
- `MAX_PARALLEL_RUNS_PER_MODEL` - Concurrent puzzle runs per model (default: 10)
- `REQUEST_TIMEOUT_MS` - Per-request timeout; a timed-out request is stored as a failed run (default: 30 minutes)

`NONOBENCH_DB`, `NONOBENCH_RESULTS_JSON` and `NONOBENCH_RESULTS_RAW_JSON` override the database and export paths, which is useful for testing against a copy.

## Tech Stack

**Benchmark Runner**
- [Bun](https://bun.sh) - JavaScript runtime and SQLite
- [AI SDK](https://ai-sdk.dev) - Unified LLM interface
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

## License

MIT
