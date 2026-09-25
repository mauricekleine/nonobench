import { Database } from "bun:sqlite";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Puzzle } from "../visualizer/components/puzzles";

export const dbPath = process.env.NONOBENCH_DB ?? fileURLToPath(new URL("./results.db", import.meta.url));

// Reading never initializes or migrates the database.
export function openReadDb(): Database | null {
  return existsSync(dbPath) ? new Database(dbPath, { readonly: true, create: false }) : null;
}

let writeDb: Database | undefined;
function openWriteDb(): Database {
  if (writeDb) return writeDb;
  const db = new Database(dbPath, { create: true });
  db.run(`
    CREATE TABLE IF NOT EXISTS runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      model TEXT NOT NULL,
      puzzle_id TEXT NOT NULL,
      size TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      correct INTEGER NOT NULL,
      status TEXT NOT NULL,
      duration_ms REAL NOT NULL,
      tokens INTEGER NOT NULL,
      cost REAL NOT NULL,
      error_message TEXT,
      raw_input TEXT,
      raw_output TEXT,
      reasoning INTEGER,
      output_mode TEXT,
      reasoning_tokens INTEGER,
      UNIQUE(model, puzzle_id)
    );
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_runs_model_puzzle_id ON runs(model, puzzle_id);
    CREATE INDEX IF NOT EXISTS idx_runs_model_size ON runs(model, size);
    CREATE INDEX IF NOT EXISTS idx_runs_timestamp ON runs(timestamp);
  `);
  const columns = new Set(db.query<{ name: string }, []>("PRAGMA table_info(runs)").all().map((row) => row.name));
  // output_mode: NULL for legacy free-text runs, "json_schema" for strict structured output.
  for (const column of ["raw_input", "raw_output", "reasoning", "output_mode", "reasoning_tokens"] as const) {
    const type = column === "reasoning" || column === "reasoning_tokens" ? "INTEGER" : "TEXT";
    if (!columns.has(column)) db.run(`ALTER TABLE runs ADD COLUMN ${column} ${type}`);
  }
  writeDb = db;
  return db;
}

export type BenchmarkResult = {
  model: string;
  puzzleId: string;
  size: string;
  correct: boolean;
  cost: number;
  tokens: number;
  durationMs: number;
  status: "success" | "failed";
  errorMessage?: string;
  rawInput: string;
  rawOutput: string;
  reasoning: boolean;
  outputMode: "json_schema" | "text";
  // Null when the provider does not report reasoning tokens.
  reasoningTokens: number | null;
};

export function getPuzzleId(puzzle: Puzzle): string {
  const hasher = new Bun.CryptoHasher("md5");
  hasher.update(puzzle.solution);
  return hasher.digest("hex").slice(0, 16);
}

export function getSuccessfulPuzzlesByModel(): Map<string, Set<string>> {
  const db = openReadDb();
  const results = db?.query<{ model: string; puzzle_id: string }, []>(
    "SELECT model, puzzle_id FROM runs WHERE status = 'success'"
  ).all() ?? [];
  db?.close();
  const successful = new Map<string, Set<string>>();
  for (const row of results) {
    if (!successful.has(row.model)) successful.set(row.model, new Set());
    successful.get(row.model)!.add(row.puzzle_id);
  }
  return successful;
}

export function saveRunToDb(result: BenchmarkResult): void {
  openWriteDb().query(`
    INSERT INTO runs (model, puzzle_id, size, timestamp, correct, status, duration_ms, tokens, cost, error_message, raw_input, raw_output, reasoning, output_mode, reasoning_tokens)
    VALUES ($model, $puzzle_id, $size, $timestamp, $correct, $status, $duration_ms, $tokens, $cost, $error_message, $raw_input, $raw_output, $reasoning, $output_mode, $reasoning_tokens)
    ON CONFLICT(model, puzzle_id) DO UPDATE SET
      size = excluded.size,
      timestamp = excluded.timestamp,
      correct = excluded.correct,
      status = excluded.status,
      duration_ms = excluded.duration_ms,
      tokens = excluded.tokens,
      cost = excluded.cost,
      error_message = excluded.error_message,
      raw_input = excluded.raw_input,
      raw_output = excluded.raw_output,
      reasoning = excluded.reasoning,
      output_mode = excluded.output_mode,
      reasoning_tokens = excluded.reasoning_tokens
    WHERE runs.status = 'failed' AND runs.output_mode IS NOT NULL
  `).run({
    $model: result.model,
    $puzzle_id: result.puzzleId,
    $size: result.size,
    $timestamp: new Date().toISOString(),
    $correct: result.correct ? 1 : 0,
    $status: result.status,
    $duration_ms: result.durationMs,
    $tokens: result.tokens,
    $cost: result.cost,
    $error_message: result.errorMessage ?? null,
    $raw_input: result.rawInput,
    $raw_output: result.rawOutput,
    $reasoning: result.reasoning ? 1 : 0,
    $output_mode: result.outputMode,
    $reasoning_tokens: result.reasoningTokens,
  });
}

// Answered and correct counts for one model at one size, including runs from
// earlier invocations (so resumed runs are judged on the full set).
export function getSizeTally(model: string, size: string): { answered: number; correct: number } {
  const db = openReadDb();
  const row = db
    ?.query<{ answered: number; correct: number | null }, [string, string]>(
      "SELECT COUNT(*) AS answered, SUM(correct) AS correct FROM runs WHERE model = ? AND size = ? AND status = 'success'"
    )
    .get(model, size);
  db?.close();
  return { answered: row?.answered ?? 0, correct: row?.correct ?? 0 };
}
