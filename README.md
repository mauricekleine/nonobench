# Nonobench

A benchmark suite for evaluating LLM reasoning capabilities on Nonogram (Picross) puzzle solving across different grid sizes. Results are published at [nonobench.com](https://nonobench.com).

Built by [Maurice Kleine](https://www.mauricekleine.com/).

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

### Running Against a Local Model

The runner can benchmark a model that you serve yourself. Any server with an OpenAI-compatible `/v1` endpoint works: vLLM, SGLang, llama.cpp, LM Studio, and Ollama.

This setup uses two machines. The model server is the workstation that serves the model. The bench machine is the laptop that runs the benchmark.

#### 1. Serve the model on the workstation

Bind the server to all interfaces. The default bind address, `127.0.0.1`, accepts connections only from the model server itself.

vLLM:

```bash
vllm serve Qwen/Qwen3-32B --host 0.0.0.0 --port 8000
```

Ollama:

```bash
ollama pull qwen3:32b
OLLAMA_HOST=0.0.0.0:11434 ollama serve
```

llama.cpp:

```bash
llama-server -m ./qwen3-32b-Q4_K_M.gguf --host 0.0.0.0 --port 8080
```

SGLang:

```bash
python -m sglang.launch_server --model-path Qwen/Qwen3-32B --host 0.0.0.0 --port 30000
```

LM Studio: open the Developer tab, then select Start Server. Turn on the Network Server switch, so the server listens on all interfaces.

CAUTION: Do not expose the port to the internet. Most local servers have no authentication, so anyone who reaches the port can run the model.

#### 2. Open the port on the model server

Restrict the rule to your own subnet. Allow TCP traffic from your local network to the port:

```bash
sudo ufw allow from 192.168.1.0/24 to any port 8000 proto tcp
```

On macOS, allow incoming connections for the server app in System Settings.

#### 3. Verify the connection from the laptop

Find the LAN address of the model server. On Linux, run `ip -4 addr show`. On macOS, run `ipconfig getifaddr en0`.

From the laptop, request the model list:

```bash
curl http://192.168.1.20:8000/v1/models
```

Make sure that the answer lists your model. Copy the exact `id` value. You need that value for `NONOBENCH_LOCAL_MODEL`.

If the request fails, check the bind address from step 1. Then check the firewall rule, the address, and the port.

If the model server is not reachable on your network, create an SSH tunnel to it instead. Then use the address `http://127.0.0.1:8000/v1`:

```bash
ssh -N -L 8000:127.0.0.1:8000 user@192.168.1.20
```

#### 4. Run the benchmark

```bash
cd bench
bun install
NONOBENCH_LOCAL_BASE_URL=http://192.168.1.20:8000/v1 \
NONOBENCH_LOCAL_MODEL=Qwen3-32B \
bun run bench --model Qwen3-32B
```

Do a pilot first. The next command runs two 5x5 puzzles into a scratch database:

```bash
NONOBENCH_LOCAL_BASE_URL=http://192.168.1.20:8000/v1 \
NONOBENCH_LOCAL_MODEL=Qwen3-32B \
NONOBENCH_DB=local-pilot.db \
bun run bench --model Qwen3-32B --sizes 5x5 --limit 2
```

Make sure that the plan lists your model as `[local, text]`.

#### Environment variables for a local model

| Variable | Meaning |
| --- | --- |
| `NONOBENCH_LOCAL_BASE_URL` | The `/v1` endpoint of the server. Ollama uses port `11434`. |
| `NONOBENCH_LOCAL_MODEL` | The model `id` that the server returns from `GET /v1/models`. |
| `NONOBENCH_LOCAL_NAME` | The display name and the value for `--model`. Defaults to the model `id`. |
| `NONOBENCH_LOCAL_EFFORT` | The reasoning effort your server is configured with (`none`, `low`, `xhigh`, …). Label only — the runner never sends reasoning settings to a local server. Defaults to `none`. |
| `NONOBENCH_LOCAL_API_KEY` | The bearer token, when the server requires one. Defaults to `local`. |

The runner adds the local model to the plan only when you set both `NONOBENCH_LOCAL_BASE_URL` and `NONOBENCH_LOCAL_MODEL`.

#### Notes on local runs

- Local runs cost $0. The runner stores them in the same database as cloud runs, and `bun run export` includes them.
- Text mode is the default for a local model. Many local servers accept a JSON schema request and then ignore it. If your server enforces the schema, set `NONOBENCH_OUTPUT_MODE=json_schema`.
- Start with `--parallel 1`. One GPU serves fewer requests at the same time than a cloud provider does.
- The 20x20 tier asks for 128,000 output tokens. If your server has a smaller context, run only the core sizes.
- The runner does not apply the reasoning-token circuit breaker to a local model. Some local servers report zero reasoning tokens for every run.
- Set the same variables in `bench/.env` to avoid the prefix on every command.
- A bench run registers the local model in `bench/local-models.json` (name, family, server URL), so a later `bun run export` and the visualizer pick it up without any env vars. To register a model you already benched, add one entry there: `"<name>": { "baseURL": "http://host:port/v1", "family": "<name>" }`.

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

Each model receives the same system prompt and the puzzle's row and column clues. Standard answers are the grid as one string of `1`s and `0`s. Hard mode answers are one row per line, because at 400 cells most models miscount a single string (see `LEARNINGS.md`). An answer is correct when it satisfies every row and column clue.

Ten of the 30 puzzles (one 5x5, four 10x10, five 15x15) have more than one valid solution, so answers are checked against the clues rather than compared with the stored solution. Correctness is derived from the stored raw outputs at export time; the database is never rewritten. The puzzle test suite pins which puzzles are ambiguous, and any new puzzle must have a unique solution.

## Puzzle Data

The core tier has 30 puzzles (10 each of 5x5, 10x10 and 15x15), defined in `visualizer/components/puzzles/` and shared by the runner and the dashboard. They were sourced from [nono-dataset](https://github.com/mauricekleine/nono-dataset). Hard mode has 10 generated 20x20 puzzles. A puzzle's ID is a hash of its solution, so changing a puzzle's solution creates a new puzzle.

## Tiers and generation

Default benchmark runs cover the three core sizes (Standard). Use `--sizes 20x20` with a model selection to run Hard mode; comma-separated sizes also work. The runner's plan reports missing 20x20 work separately. Headline overall accuracy and best-variant selection use Standard runs only; Hard mode has its own results. Hard-mode requests get a 128,000-token answer budget, capped at the endpoint's maximum (`bench/max-output-tokens.json`).

From `bench/`, `bun run generate-puzzles` recreates the 20x20 set with a fixed seed. It fills grids at random (no pictures, so a model can't guess the image), keeps grids with at least three blocks per line and little mirror symmetry, and checks uniqueness with an exact solver (`NONOGRAM_SOLVER`). The set mixes five puzzles that row-and-column propagation solves with five where it stalls with 20–200 cells left. `bun test` verifies their clues, uniqueness flags and line solvability; the original ambiguity list remains pinned.

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
