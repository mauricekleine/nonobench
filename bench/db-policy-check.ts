import { strict as assert } from "node:assert";
import { Database } from "bun:sqlite";
import { openReadDb, saveRunToDb, type BenchmarkResult } from "./db";

// Writes test rows, so it must only ever run against a scratch copy.
if (!process.env.NONOBENCH_DB) throw new Error("Set NONOBENCH_DB to a scratch copy of the database");

const read = () => {
  const db = openReadDb();
  assert(db);
  return db;
};
const db = read();
type Row = { model: string; puzzle_id: string; size: string; raw_output: string | null; status: string };
const original = db.query<Row, []>("SELECT model, puzzle_id, size, raw_output, status FROM runs WHERE status = 'success' LIMIT 1").get();
assert(original);
db.close();
const fake: BenchmarkResult = {
  model: original.model,
  puzzleId: original.puzzle_id,
  size: original.size,
  correct: false,
  cost: 0,
  tokens: 0,
  durationMs: 100,
  attemptDurationMs: 23,
  status: "failed",
  rawInput: "test",
  rawOutput: "overwrite attempt",
  reasoning: false,
  outputMode: "json_schema",
  reasoningTokens: null,
  providerName: "Test Provider",
  quantization: "fp8",
  generationId: "gen-test",
  finishReason: "stop",
  codeRevision: "test123",
  startedAt: "2026-09-25T12:00:00.000Z",
};
saveRunToDb(fake);
let check = read();
assert.deepEqual(check.query<Row, [string, string]>("SELECT model, puzzle_id, size, raw_output, status FROM runs WHERE model = ? AND puzzle_id = ?").get(original.model, original.puzzle_id), original);
check.close();
const retry = { ...fake, model: "__policy_test__", puzzleId: "__policy_test__" };
saveRunToDb(retry);
saveRunToDb({ ...retry, status: "success", correct: true, rawOutput: "retried" });
saveRunToDb({ ...retry, status: "failed", rawOutput: "blocked" });
const timeout = { ...retry, model: "__timeout_test__", status: "timeout" as const, rawOutput: "" };
saveRunToDb(timeout);
saveRunToDb({ ...timeout, status: "success", rawOutput: "blocked timeout" });
check = read();
const final = check.query<{ status: string; raw_output: string; provider_name: string; quantization: string; generation_id: string; finish_reason: string; code_revision: string }, [string]>("SELECT status, raw_output, provider_name, quantization, generation_id, finish_reason, code_revision FROM runs WHERE model = ?").get(retry.model);
assert.deepEqual(final, { status: "success", raw_output: "retried", provider_name: "Test Provider", quantization: "fp8", generation_id: "gen-test", finish_reason: "stop", code_revision: "test123" });
const columns = check.query<{ name: string }, []>("PRAGMA table_info(attempts)").all().map((column) => column.name);
assert.deepEqual(columns, ["id", "model", "puzzle_id", "size", "started_at", "duration_ms", "status", "error_message", "tokens", "reasoning_tokens", "cost", "provider_name", "quantization", "generation_id", "finish_reason", "output_mode", "code_revision", "raw_output"]);
const attempts = check.query<{ model: string; status: string; raw_output: string; started_at: string; duration_ms: number; finish_reason: string; code_revision: string }, []>("SELECT model, status, raw_output, started_at, duration_ms, finish_reason, code_revision FROM attempts ORDER BY id").all();
assert.deepEqual(attempts, [
  { model: original.model, status: "failed", raw_output: "overwrite attempt", started_at: fake.startedAt, duration_ms: 23, finish_reason: "stop", code_revision: "test123" },
  { model: retry.model, status: "failed", raw_output: "overwrite attempt", started_at: fake.startedAt, duration_ms: 23, finish_reason: "stop", code_revision: "test123" },
  { model: retry.model, status: "success", raw_output: "retried", started_at: fake.startedAt, duration_ms: 23, finish_reason: "stop", code_revision: "test123" },
  { model: retry.model, status: "failed", raw_output: "blocked", started_at: fake.startedAt, duration_ms: 23, finish_reason: "stop", code_revision: "test123" },
  { model: timeout.model, status: "timeout", raw_output: "", started_at: fake.startedAt, duration_ms: 23, finish_reason: "stop", code_revision: "test123" },
  { model: timeout.model, status: "success", raw_output: "blocked timeout", started_at: fake.startedAt, duration_ms: 23, finish_reason: "stop", code_revision: "test123" },
]);
assert.equal(check.query<{ status: string }, [string]>("SELECT status FROM runs WHERE model = ?").get(timeout.model)?.status, "timeout");
check.close();
const writeCheck = new Database(process.env.NONOBENCH_DB);
assert.throws(() => writeCheck.run("UPDATE attempts SET status = 'failed' WHERE id = 1"), /append-only/);
assert.throws(() => writeCheck.run("DELETE FROM attempts WHERE id = 1"), /append-only/);
writeCheck.close();
console.log("Success rows preserved; failed rows retried; later writes blocked.");
