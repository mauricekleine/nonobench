import { Database } from "bun:sqlite";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
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
      provider_name TEXT,
      quantization TEXT,
      generation_id TEXT,
      finish_reason TEXT,
      code_revision TEXT,
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
  for (const column of ["raw_input", "raw_output", "reasoning", "output_mode", "reasoning_tokens", "provider_name", "quantization", "generation_id", "finish_reason", "code_revision", "answer_format"] as const) {
    const type = column === "reasoning" || column === "reasoning_tokens" ? "INTEGER" : "TEXT";
    if (!columns.has(column)) db.run(`ALTER TABLE runs ADD COLUMN ${column} ${type}`);
  }
  db.run(`
    CREATE TABLE IF NOT EXISTS attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      model TEXT NOT NULL,
      puzzle_id TEXT NOT NULL,
      size TEXT NOT NULL,
      started_at TEXT NOT NULL,
      duration_ms REAL NOT NULL,
      status TEXT NOT NULL,
      error_message TEXT,
      tokens INTEGER NOT NULL,
      reasoning_tokens INTEGER,
      cost REAL NOT NULL,
      provider_name TEXT,
      quantization TEXT,
      generation_id TEXT,
      finish_reason TEXT,
      output_mode TEXT NOT NULL,
      code_revision TEXT NOT NULL,
      raw_output TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_attempts_model_puzzle_id ON attempts(model, puzzle_id);
    CREATE TRIGGER IF NOT EXISTS attempts_no_update BEFORE UPDATE ON attempts
    BEGIN SELECT RAISE(ABORT, 'attempts are append-only'); END;
    CREATE TRIGGER IF NOT EXISTS attempts_no_delete BEFORE DELETE ON attempts
    BEGIN SELECT RAISE(ABORT, 'attempts are append-only'); END;
  `);
  const attemptColumns = new Set(db.query<{ name: string }, []>("PRAGMA table_info(attempts)").all().map((row) => row.name));
  if (!attemptColumns.has("answer_format")) db.run("ALTER TABLE attempts ADD COLUMN answer_format TEXT");
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
  attemptDurationMs?: number;
  // "timeout": cut off by a documented provider time limit. Final (never
  // retried) and counted as an unsolved attempt.
  status: "success" | "failed" | "timeout";
  errorMessage?: string;
  rawInput: string;
  rawOutput: string;
  reasoning: boolean;
  outputMode: "json_schema" | "text";
  // How the grid was requested; NULL in older rows means "flat".
  answerFormat?: "flat" | "rows";
  // Null when the provider does not report reasoning tokens.
  reasoningTokens: number | null;
  providerName?: string | null;
  quantization?: string | null;
  generationId?: string | null;
  finishReason?: string | null;
  codeRevision?: string;
  startedAt?: string;
};

let cachedCodeRevision: string | undefined;
export function codeRevision(): string {
  if (cachedCodeRevision !== undefined) return cachedCodeRevision;
  try {
    const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
    const result = Bun.spawnSync({ cmd: ["git", "rev-parse", "--short", "HEAD"], cwd: repoRoot, stdout: "pipe", stderr: "ignore" });
    cachedCodeRevision = result.exitCode === 0 ? new TextDecoder().decode(result.stdout).trim() || "unknown" : "unknown";
  } catch {
    cachedCodeRevision = "unknown";
  }
  return cachedCodeRevision;
}

export function getPuzzleId(puzzle: Puzzle): string {
  const hasher = new Bun.CryptoHasher("md5");
  hasher.update(puzzle.solution);
  return hasher.digest("hex").slice(0, 16);
}

export function getSuccessfulPuzzlesByModel(): Map<string, Set<string>> {
  const db = openReadDb();
  const results = db?.query<{ model: string; puzzle_id: string }, []>(
    "SELECT model, puzzle_id FROM runs WHERE status IN ('success', 'timeout')"
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
  const db = openWriteDb();
  const values = {
    $model: result.model,
    $puzzle_id: result.puzzleId,
    $size: result.size,
    $timestamp: new Date().toISOString(),
    $started_at: result.startedAt ?? new Date(Date.now() - result.durationMs).toISOString(),
    $correct: result.correct ? 1 : 0,
    $status: result.status,
    $duration_ms: result.durationMs,
    $attempt_duration_ms: result.attemptDurationMs ?? result.durationMs,
    $tokens: result.tokens,
    $cost: result.cost,
    $error_message: result.errorMessage ?? null,
    $raw_input: result.rawInput,
    $raw_output: result.rawOutput,
    $reasoning: result.reasoning ? 1 : 0,
    $output_mode: result.outputMode,
    $reasoning_tokens: result.reasoningTokens,
    $provider_name: result.providerName ?? null,
    $quantization: result.quantization ?? null,
    $generation_id: result.generationId ?? null,
    $finish_reason: result.finishReason ?? null,
    $code_revision: result.codeRevision ?? codeRevision(),
    $answer_format: result.answerFormat ?? "flat",
  };
  db.transaction(() => {
    db.query(`
      INSERT INTO attempts (model, puzzle_id, size, started_at, duration_ms, status, error_message, tokens, reasoning_tokens, cost, provider_name, quantization, generation_id, finish_reason, output_mode, code_revision, raw_output, answer_format)
      VALUES ($model, $puzzle_id, $size, $started_at, $attempt_duration_ms, $status, $error_message, $tokens, $reasoning_tokens, $cost, $provider_name, $quantization, $generation_id, $finish_reason, $output_mode, $code_revision, $raw_output, $answer_format)
    `).run(values);
    db.query(`
    INSERT INTO runs (model, puzzle_id, size, timestamp, correct, status, duration_ms, tokens, cost, error_message, raw_input, raw_output, reasoning, output_mode, reasoning_tokens, provider_name, quantization, generation_id, finish_reason, code_revision, answer_format)
    VALUES ($model, $puzzle_id, $size, $timestamp, $correct, $status, $duration_ms, $tokens, $cost, $error_message, $raw_input, $raw_output, $reasoning, $output_mode, $reasoning_tokens, $provider_name, $quantization, $generation_id, $finish_reason, $code_revision, $answer_format)
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
      reasoning_tokens = excluded.reasoning_tokens,
      provider_name = excluded.provider_name,
      quantization = excluded.quantization,
      generation_id = excluded.generation_id,
      finish_reason = excluded.finish_reason,
      code_revision = excluded.code_revision,
      answer_format = excluded.answer_format
    WHERE runs.status = 'failed' AND runs.output_mode IS NOT NULL
  `).run(values);
  })();
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
