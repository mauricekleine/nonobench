import { generateText, jsonSchema, NoObjectGeneratedError, Output, streamText } from "ai";
import { codeBlock } from "common-tags";
import { PUZZLES, type Puzzle } from "../visualizer/components/puzzles";
import {
  MAX_PARALLEL_RUNS_PER_MODEL,
  MODELS,
  REQUEST_TIMEOUT_MS,
  outputModeFor,
  type Model,
} from "./constants";
import {
  dbPath,
  getPuzzleId,
  getSizeTally,
  getSuccessfulPuzzlesByModel,
  saveRunToDb,
  type BenchmarkResult,
} from "./db";
import { gradeOutput } from "./grade";
import { CORE_SIZES, EXTENDED_SIZES, sortSizes } from "./sizes";

globalThis.AI_SDK_LOG_WARNINGS = false;

const successfulPuzzlesByModel = getSuccessfulPuzzlesByModel();

const args = process.argv.slice(2);
const selectedNames = new Set<string>();
let allMissing = false;
let limit = Infinity;
let maxCost = Infinity;
let maxParallel = MAX_PARALLEL_RUNS_PER_MODEL;
let selectedSizes: string[] = [...CORE_SIZES];
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === "--all-missing") {
    allMissing = true;
  } else if (arg === "--limit") {
    limit = Number(args[++i]);
    if (!Number.isInteger(limit) || limit < 1) {
      console.error("--limit needs a positive integer (puzzles per size)");
      process.exit(1);
    }
  } else if (arg === "--parallel") {
    maxParallel = Number(args[++i]);
    if (!Number.isInteger(maxParallel) || maxParallel < 1) {
      console.error("--parallel needs a positive integer");
      process.exit(1);
    }
  } else if (arg === "--max-cost") {
    maxCost = Number(args[++i]);
    if (!(maxCost > 0)) {
      console.error("--max-cost needs a positive USD amount");
      process.exit(1);
    }
  } else if (arg === "--model") {
    const name = args[++i];
    if (!name || name.startsWith("--") || !MODELS.some((model) => model.name === name)) {
      console.error(`Unknown or missing model: ${name ?? "(missing)"}`);
      process.exit(1);
    }
    selectedNames.add(name);
  } else if (arg === "--sizes") {
    const value = args[++i];
    const validSizes: readonly string[] = [...CORE_SIZES, ...EXTENDED_SIZES];
    const parsed = value?.split(",") ?? [];
    if (!parsed.length || parsed.some((size) => !validSizes.includes(size)) || new Set(parsed).size !== parsed.length) {
      console.error(`--sizes needs comma-separated sizes from: ${validSizes.join(", ")}`);
      process.exit(1);
    }
    selectedSizes = sortSizes(parsed);
  } else {
    console.error(`Unknown argument: ${arg}`);
    process.exit(1);
  }
}
if (allMissing && selectedNames.size > 0) {
  console.error("Use either --all-missing or --model, not both.");
  process.exit(1);
}
const selectedModels = allMissing ? MODELS : MODELS.filter((model) => selectedNames.has(model.name));
const plannedPuzzles = PUZZLES.filter((puzzle) => selectedSizes.includes(`${puzzle.width}x${puzzle.height}`));
const extendedPuzzles = PUZZLES.filter((puzzle) => EXTENDED_SIZES.some((size) => size === `${puzzle.width}x${puzzle.height}`));
console.log(`Benchmark plan (${dbPath}):`);
for (const model of MODELS) {
  const success = successfulPuzzlesByModel.get(model.name) ?? new Set();
  const missing = plannedPuzzles.filter((puzzle) => !success.has(getPuzzleId(puzzle))).length;
  const extendedMissing = extendedPuzzles.filter((puzzle) => !success.has(getPuzzleId(puzzle))).length;
  console.log(`  ${model.name}: ${missing} missing/retryable of ${plannedPuzzles.length} selected; 20x20: ${extendedMissing} missing/retryable of ${extendedPuzzles.length}`);
}
if (selectedModels.length === 0) {
  console.log("Select --model <name> (repeatable) or --all-missing to run.");
  process.exit(0);
}

type ModelSizeStats = {
  totalPuzzles: number;
  correctCount: number;
  failedCount: number;
  totalDuration: number;
  totalTokens: number;
  totalCost: number;
};

// Custom table formatter that doesn't show the index column
function printTable<T extends Record<string, unknown>>(data: T[]): void {
  if (data.length === 0) return;

  const firstRow = data[0];
  if (!firstRow) return;

  const columns = Object.keys(firstRow);
  const colWidths: Record<string, number> = {};

  // Calculate column widths
  for (const col of columns) {
    colWidths[col] = col.length;
    for (const row of data) {
      const val = String(row[col] ?? "");
      const width = colWidths[col] ?? 0;
      colWidths[col] = Math.max(width, val.length);
    }
  }

  // Build separator
  const sep = columns
    .map((col) => "─".repeat((colWidths[col] ?? 0) + 2))
    .join("┼");

  // Print header
  const header = columns
    .map((col) => ` ${col.padEnd(colWidths[col] ?? 0)} `)
    .join("│");
  console.log(`┌${"─".repeat(sep.length)}┐`);
  console.log(`│${header}│`);
  console.log(`├${sep}┤`);

  // Print rows
  for (const row of data) {
    const line = columns
      .map((col) => ` ${String(row[col] ?? "").padEnd(colWidths[col] ?? 0)} `)
      .join("│");
    console.log(`│${line}│`);
  }

  console.log(`└${"─".repeat(sep.length)}┘`);
}

// Streaming changes only the transport: OpenRouter sends keepalive comments
// while the model thinks, so no idle timer (ours or upstream) cuts off long,
// silent requests. Used for models whose endpoints drop responses that take
// more than five minutes.
async function callModel(model: Model, options: Parameters<typeof generateText>[0]) {
  if (!model.stream) return generateText(options);
  let streamError: unknown;
  const result = streamText({ ...options, onError: ({ error }) => { streamError = error; } } as Parameters<typeof streamText>[0]);
  const [text, usage, providerMetadata] = await Promise.all([result.text, result.totalUsage, result.providerMetadata]);
  if (streamError) throw streamError;
  return { text, usage, providerMetadata };
}

// OpenRouter records each generation's cost; stats can lag a few seconds.
async function fetchGenerationCost(id: string | undefined): Promise<number | null> {
  if (!id) return null;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const response = await fetch(`https://openrouter.ai/api/v1/generation?id=${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` },
      });
      if (response.ok) {
        const body = (await response.json()) as { data?: { total_cost?: number } };
        if (typeof body.data?.total_cost === "number") return body.data.total_cost;
      }
    } catch {
      // Retry below.
    }
    await Bun.sleep(3000);
  }
  return null;
}

async function runBenchmark(
  puzzle: Puzzle,
  model: Model
): Promise<BenchmarkResult> {
  const start = performance.now();
  const size = `${puzzle.height}x${puzzle.width}`;
  const puzzleId = getPuzzleId(puzzle);

  let cost = 0;
  let tokens = 0;
  let correct = false;
  let status: BenchmarkResult["status"] = "success";
  let errorMessage: string | undefined;
  let rawOutput = "";
  let reasoningTokens: number | null = null;
  const cells = puzzle.width * puzzle.height;
  const outputMode = outputModeFor(model);

  const systemPrompt = codeBlock`
		You are solving a nonogram (also known as picross or griddlers).

		## Rules
		- Each row and column has clues: numbers indicating consecutive groups of filled cells
		- Groups are separated by at least one empty cell
		- The clues appear in order from left-to-right (for rows) or top-to-bottom (for columns)

		## Example
		A row clue "2 1" on a 5-cell row means: 2 filled cells, then a gap, then 1 filled cell.
		Possible solutions: "11010" or "11001" (but only one will satisfy all column constraints)

		## Your Task
		Solve the puzzle so ALL row AND column clues are satisfied simultaneously.

		## Output Format
		Output ONLY the solution as a single string of ${
      puzzle.width * puzzle.height
    } characters.
		- Use "1" for filled cells, "0" for empty cells
		- Read left-to-right, top-to-bottom (row 1 first, then row 2, etc.)

		IMPORTANT:
		- Do NOT include any explanation, reasoning, or intermediate steps
		- Do NOT include any other text, formatting, or symbols
		- Before outputting, ensure the solution satisfies every row and every column clue
		- If no solution satisfies all constraints, do NOT guess; output "0" instead

		You MUST ONLY output the ${
      puzzle.width * puzzle.height
    }-character solution string and nothing else.
	`;

  const rawInput = `${systemPrompt}\n\n${puzzle.clues.canonical}`;

  try {
    // Strict structured output: the provider constrains the final answer to the
    // schema, so models cannot wrap the grid in prose. require_parameters makes
    // OpenRouter refuse endpoints that would silently ignore the schema.
    const resp = await callModel(model, {
      model: model.llm,
      prompt: puzzle.clues.canonical,
      system: systemPrompt,
      timeout: REQUEST_TIMEOUT_MS,
      ...(outputMode === "json_schema" ? { output: Output.object({
        name: "nonogram_solution",
        schema: jsonSchema<{ solution: string }>({
          type: "object",
          properties: {
            solution: {
              type: "string",
              description: `The solved grid as exactly ${cells} characters of "1" (filled) and "0" (empty), row by row.`,
            },
          },
          required: ["solution"],
          additionalProperties: false,
        }),
      }),
      providerOptions: { openrouter: { provider: { require_parameters: true } } } } : {}),
    });

    rawOutput = resp.text;
    correct = gradeOutput(puzzle, resp.text);

    const openrouterMeta = resp.providerMetadata?.openrouter as
      | { usage?: { costDetails?: { upstreamInferenceCost?: number }; cost?: number } }
      | undefined;
    const upstreamCost = openrouterMeta?.usage?.costDetails?.upstreamInferenceCost;
    cost = upstreamCost && upstreamCost > 0 ? upstreamCost : (openrouterMeta?.usage?.cost ?? 0);
    tokens = resp.usage.outputTokens ?? 0;
    reasoningTokens = resp.usage.outputTokenDetails?.reasoningTokens ?? null;

    // Every returned answer counts, including runs where the model chose not
    // to reason: retrying those until it does would cherry-pick. Endpoints
    // that systematically drop reasoning are caught per model below.
    status = "success";
  } catch (err: any) {
    if (NoObjectGeneratedError.isInstance(err) && err.text) {
      // The model answered but the SDK could not validate the JSON (e.g. a
      // truncated response). Grade what it said; the error carries no cost, so
      // look it up from OpenRouter's generation record.
      rawOutput = err.text;
      correct = gradeOutput(puzzle, err.text);
      tokens = err.usage?.outputTokens ?? 0;
      reasoningTokens = err.usage?.outputTokenDetails?.reasoningTokens ?? null;
      const generationCost = await fetchGenerationCost(err.response?.id);
      cost = generationCost ?? 0;
      status = "success";
      errorMessage = `Schema validation failed${generationCost === null ? " (cost unavailable)" : ""}: ${err.message}`;
    } else {
    console.error(
      `[${model.name}] Error:`,
      err?.message ? JSON.stringify(err, null, 2) : String(err)
    );

    status = "failed";
    errorMessage = err?.message ?? String(err);
    correct = false;
    cost = 0;
    tokens = 0;
    // A request that dies at a provider's documented time limit will die
    // there again: record it as a final, unsolved attempt instead of retrying.
    const limit = model.providerTimeLimit;
    if (limit && performance.now() - start >= limit.seconds * 1000 - 5000) {
      status = "timeout";
      errorMessage = limit.note;
    }
    }
  }

  const end = performance.now();
  const durationMs = end - start;

  return {
    model: model.name,
    puzzleId,
    size,
    correct,
    cost,
    tokens,
    durationMs,
    status,
    rawInput,
    rawOutput,
    reasoning: model.reasoning,
    outputMode,
    reasoningTokens,
    ...(errorMessage ? { errorMessage } : {}),
  };
}

// Group puzzles by size
function groupPuzzlesBySize(puzzles: Puzzle[]): Map<string, Puzzle[]> {
  const groups = new Map<string, Puzzle[]>();
  for (const puzzle of puzzles) {
    const size = `${puzzle.height}x${puzzle.width}`;
    if (!groups.has(size)) {
      groups.set(size, []);
    }
    groups.get(size)!.push(puzzle);
  }
  return groups;
}

let sessionCost = 0;
let budgetExhausted = false;

// Circuit breaker: some schema-enforcing endpoints silently disable reasoning
// (MiniMax M3 did on every one). If most of a reasoning variant's first runs
// report zero reasoning tokens, stop that model and flag it instead of
// recording a misleading score.
const BREAKER_SAMPLE = 8;
const BREAKER_MAX_ZERO_SHARE = 0.5;
function reasoningLooksBroken(model: Model, results: BenchmarkResult[]): boolean {
  if (!model.reasoning) return false;
  const answered = results.filter((result) => result.status === "success").slice(0, BREAKER_SAMPLE);
  if (answered.length < BREAKER_SAMPLE) return false;
  const zero = answered.filter((result) => result.reasoningTokens === 0).length;
  return zero / answered.length > BREAKER_MAX_ZERO_SHARE;
}

// Run benchmark for a single model (puzzles in parallel with concurrency limit)
async function runModelBenchmark(model: Model): Promise<BenchmarkResult[]> {
  const puzzlesBySize = groupPuzzlesBySize(plannedPuzzles);
  const successfulPuzzles = successfulPuzzlesByModel.get(model.name) ?? new Set();
  const allResults: BenchmarkResult[] = [];

  for (const [size, puzzles] of puzzlesBySize) {
    // A model that answered every 5x5 but solved none with structured output
    // almost certainly has an output-format problem, not a reasoning one:
    // stop before spending on larger grids and flag it for a text-mode check.
    // Counts come from the database, so earlier sessions are included.
    if (size !== "5x5" && outputModeFor(model) === "json_schema") {
      const tally = getSizeTally(model.name, "5x5");
      const fiveByFive = PUZZLES.filter((puzzle) => puzzle.width === 5 && puzzle.height === 5).length;
      if (tally.answered === fiveByFive && tally.correct === 0) {
        console.log(`[${model.name}] Stopped: 0/${tally.answered} on 5x5 with structured output; likely a format issue. Check it in text mode.`);
        return allResults;
      }
    }
    // Filter out successfully benchmarked puzzles
    const puzzlesToRun = puzzles
      .slice(0, limit)
      .filter((puzzle) => !successfulPuzzles.has(getPuzzleId(puzzle)));

    if (puzzlesToRun.length === 0) {
      console.log(
        `[${model.name}] Skipping ${size} (all ${puzzles.length} puzzles successfully benchmarked)`
      );
      continue;
    }

    const skippedCount = puzzles.length - puzzlesToRun.length;
    if (skippedCount > 0) {
      console.log(
        `[${model.name}] Starting ${size} (${puzzlesToRun.length} puzzles, ${skippedCount} skipped, max ${maxParallel} parallel)`
      );
    } else {
      console.log(
        `[${model.name}] Starting ${size} (${puzzlesToRun.length} puzzles, max ${maxParallel} parallel)`
      );
    }

    // Run puzzles in parallel with concurrency limit
    let completedCount = 0;
    const sizeResults: BenchmarkResult[] = [];
    const pending = new Set<Promise<void>>();

    for (const puzzle of puzzlesToRun) {
      // Wait if we've hit the concurrency limit
      if (pending.size >= maxParallel) {
        await Promise.race(pending);
      }
      if (reasoningLooksBroken(model, allResults)) {
        console.log(`[${model.name}] Stopped: most runs report zero reasoning tokens; check the endpoint.`);
        await Promise.all(pending);
        return allResults;
      }
      // Budget guard: stop launching once this session's spend reaches the cap.
      // In-flight requests still finish, so overshoot is bounded by them.
      if (sessionCost >= maxCost) {
        if (!budgetExhausted) console.log(`Budget of $${maxCost} reached; not starting further puzzles.`);
        budgetExhausted = true;
        break;
      }

      const task = (async () => {
        const result = await runBenchmark(puzzle, model);
        sessionCost += result.cost;
        allResults.push(result);
        sizeResults.push(result);

        // Save to database immediately after each puzzle
        saveRunToDb(result);

        // Log progress
        completedCount++;
        const status = result.correct
          ? "✓"
          : result.status === "failed"
          ? "✗"
          : "○";
        console.log(
          `[${model.name}] ${size} puzzle ${completedCount}/${puzzlesToRun.length}: ${status}`
        );
      })();

      const trackedTask = task.then(() => {
        pending.delete(trackedTask);
      });
      pending.add(trackedTask);
    }

    // Wait for remaining tasks to complete
    await Promise.all(pending);

    // Log completion of this size
    const correctCount = sizeResults.filter((r) => r.correct).length;
    const failedCount = sizeResults.filter((r) => r.status === "failed").length;
    console.log(
      `[${model.name}] Completed ${size}: ${correctCount}/${sizeResults.length} correct, ${failedCount} failed`
    );

  }

  return allResults;
}

// Main execution - run all models in parallel, each processing puzzles in parallel (with concurrency limit)
console.log("\n" + "=".repeat(60));
console.log("STARTING BENCHMARK");
console.log("=".repeat(60));
console.log(`Models: ${selectedModels.map((m) => m.name).join(", ")}`);
console.log(
  `Sizes: ${selectedSizes.join(", ")}`
);
console.log(`Parallel runs per model: ${maxParallel}`);
console.log(`Database: ${dbPath}`);
console.log("=".repeat(60) + "\n");

const allResults = await Promise.all(
  selectedModels.map((model) => runModelBenchmark(model))
);
const flatResults = allResults.flat();

// Aggregate results by model and size for display
const statsMap = new Map<string, Map<string, ModelSizeStats>>();

for (const result of flatResults) {
  if (!statsMap.has(result.model)) {
    statsMap.set(result.model, new Map());
  }
  const modelMap = statsMap.get(result.model)!;

  if (!modelMap.has(result.size)) {
    modelMap.set(result.size, {
      totalPuzzles: 0,
      correctCount: 0,
      failedCount: 0,
      totalDuration: 0,
      totalTokens: 0,
      totalCost: 0,
    });
  }
  const stats = modelMap.get(result.size)!;

  stats.totalPuzzles++;
  if (result.correct) stats.correctCount++;
  if (result.status === "failed") stats.failedCount++;
  stats.totalDuration += result.durationMs;
  stats.totalTokens += result.tokens;
  stats.totalCost += result.cost;
}

// Get all unique sizes in order
const allSizes = sortSizes([...new Set(flatResults.map((r) => r.size))]);

// Display results
console.log("\n" + "=".repeat(60));
console.log("BENCHMARK RESULTS");
console.log("=".repeat(60));

for (const model of MODELS) {
  const modelStats = statsMap.get(model.name);
  if (!modelStats || modelStats.size === 0) continue;

  console.log(`\n=== Model: ${model.name} ===`);

  const tableData: Array<{
    Size: string;
    Puzzles: number;
    Correct: number;
    Failed: number;
    Accuracy: string;
    "Avg Time": string;
    "Avg Tokens": string;
    "Total Tokens": string;
    "Avg Cost": string;
    "Total Cost": string;
  }> = [];

  let modelTotalPuzzles = 0;
  let modelTotalCorrect = 0;
  let modelTotalFailed = 0;
  let modelTotalDuration = 0;
  let modelTotalTokens = 0;
  let modelTotalCost = 0;

  for (const size of allSizes) {
    const stats = modelStats.get(size);
    if (!stats) continue;

    const accuracy = (stats.correctCount / stats.totalPuzzles) * 100;
    const avgDuration = stats.totalDuration / stats.totalPuzzles;
    const avgTokens = stats.totalTokens / stats.totalPuzzles;
    const avgCost = stats.totalCost / stats.totalPuzzles;

    tableData.push({
      Size: size,
      Puzzles: stats.totalPuzzles,
      Correct: stats.correctCount,
      Failed: stats.failedCount,
      Accuracy: `${accuracy.toFixed(2)}%`,
      "Avg Time": `${avgDuration.toLocaleString(undefined, {
        maximumFractionDigits: 0,
      })}ms`,
      "Avg Tokens": avgTokens.toLocaleString(undefined, {
        maximumFractionDigits: 0,
      }),
      "Total Tokens": stats.totalTokens.toLocaleString(),
      "Avg Cost": `$${avgCost.toFixed(5)}`,
      "Total Cost": `$${stats.totalCost.toFixed(5)}`,
    });

    modelTotalPuzzles += stats.totalPuzzles;
    modelTotalCorrect += stats.correctCount;
    modelTotalFailed += stats.failedCount;
    modelTotalDuration += stats.totalDuration;
    modelTotalTokens += stats.totalTokens;
    modelTotalCost += stats.totalCost;
  }

  // Add totals row
  if (modelTotalPuzzles > 0) {
    const overallAccuracy = (modelTotalCorrect / modelTotalPuzzles) * 100;
    const overallAvgDuration = modelTotalDuration / modelTotalPuzzles;
    const overallAvgTokens = modelTotalTokens / modelTotalPuzzles;
    const overallAvgCost = modelTotalCost / modelTotalPuzzles;

    tableData.push({
      Size: "TOTAL",
      Puzzles: modelTotalPuzzles,
      Correct: modelTotalCorrect,
      Failed: modelTotalFailed,
      Accuracy: `${overallAccuracy.toFixed(2)}%`,
      "Avg Time": `${overallAvgDuration.toLocaleString(undefined, {
        maximumFractionDigits: 0,
      })}ms`,
      "Avg Tokens": overallAvgTokens.toLocaleString(undefined, {
        maximumFractionDigits: 0,
      }),
      "Total Tokens": modelTotalTokens.toLocaleString(),
      "Avg Cost": `$${overallAvgCost.toFixed(5)}`,
      "Total Cost": `$${modelTotalCost.toFixed(5)}`,
    });

    printTable(tableData);
  }
}

// Model ranking table (sorted by accuracy) - only for models that ran this session
type ModelRanking = {
  Rank: number;
  Model: string;
  Accuracy: string;
  "Avg Tokens": string;
  "Avg Time": string;
  "Avg Cost": string;
  "Total Cost": string;
};

const modelRankings: Array<{
  model: string;
  accuracy: number;
  avgTokens: number;
  avgTime: number;
  avgCost: number;
  totalCost: number;
}> = [];

for (const model of MODELS) {
  const modelStats = statsMap.get(model.name);
  if (!modelStats || modelStats.size === 0) continue;

  let totalPuzzles = 0;
  let totalCorrect = 0;
  let totalDuration = 0;
  let totalTokens = 0;
  let totalCost = 0;

  for (const size of allSizes) {
    const stats = modelStats.get(size);
    if (!stats) continue;
    totalPuzzles += stats.totalPuzzles;
    totalCorrect += stats.correctCount;
    totalDuration += stats.totalDuration;
    totalTokens += stats.totalTokens;
    totalCost += stats.totalCost;
  }

  if (totalPuzzles > 0) {
    modelRankings.push({
      model: model.name,
      accuracy: (totalCorrect / totalPuzzles) * 100,
      avgTokens: totalTokens / totalPuzzles,
      avgTime: totalDuration / totalPuzzles,
      avgCost: totalCost / totalPuzzles,
      totalCost,
    });
  }
}

if (modelRankings.length > 0) {
  // Sort by accuracy descending
  modelRankings.sort((a, b) => b.accuracy - a.accuracy);

  const rankingTableData: ModelRanking[] = modelRankings.map((m, idx) => ({
    Rank: idx + 1,
    Model: m.model,
    Accuracy: `${m.accuracy.toFixed(2)}%`,
    "Avg Tokens": m.avgTokens.toLocaleString(undefined, {
      maximumFractionDigits: 0,
    }),
    "Avg Time": `${m.avgTime.toLocaleString(undefined, {
      maximumFractionDigits: 0,
    })}ms`,
    "Avg Cost": `$${m.avgCost.toFixed(5)}`,
    "Total Cost": `$${m.totalCost.toFixed(5)}`,
  }));

  console.log("\n" + "=".repeat(60));
  console.log("MODEL RANKING (by accuracy) - This Session");
  console.log("=".repeat(60));
  printTable(rankingTableData);
}

// Global summary stats for this session
if (flatResults.length > 0) {
  const globalTotalRuns = flatResults.length;
  const globalTotalCorrect = flatResults.filter((r) => r.correct).length;
  const globalTotalFailed = flatResults.filter(
    (r) => r.status === "failed"
  ).length;
  const globalTotalDuration = flatResults.reduce(
    (sum, r) => sum + r.durationMs,
    0
  );
  const globalTotalTokens = flatResults.reduce((sum, r) => sum + r.tokens, 0);
  const globalTotalCost = flatResults.reduce((sum, r) => sum + r.cost, 0);

  console.log("\n" + "=".repeat(60));
  console.log("SESSION SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total Runs:       ${globalTotalRuns.toLocaleString()}`);
  console.log(
    `Total Correct:    ${globalTotalCorrect.toLocaleString()} (${(
      (globalTotalCorrect / globalTotalRuns) *
      100
    ).toFixed(2)}%)`
  );
  console.log(
    `Total Failed:     ${globalTotalFailed.toLocaleString()} (${(
      (globalTotalFailed / globalTotalRuns) *
      100
    ).toFixed(2)}%)`
  );
  console.log(
    `Total Run Time:   ${(globalTotalDuration / 1000).toLocaleString(
      undefined,
      { maximumFractionDigits: 2 }
    )}s (${globalTotalDuration.toLocaleString(undefined, {
      maximumFractionDigits: 0,
    })}ms)`
  );
  console.log(`Total Tokens:     ${globalTotalTokens.toLocaleString()}`);
  console.log(`Total Cost:       $${globalTotalCost.toFixed(5)}`);
  console.log("=".repeat(60));
}

console.log(`\nResults saved to database: ${dbPath}`);
console.log(`Run 'bun run export' to generate results.json`);
