import { strict as assert } from "node:assert";
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
  durationMs: 0,
  status: "failed",
  rawInput: "test",
  rawOutput: "overwrite attempt",
  reasoning: false,
  outputMode: "json_schema",
  reasoningTokens: null,
};
saveRunToDb(fake);
let check = read();
assert.deepEqual(check.query<Row, [string, string]>("SELECT model, puzzle_id, size, raw_output, status FROM runs WHERE model = ? AND puzzle_id = ?").get(original.model, original.puzzle_id), original);
check.close();
const retry = { ...fake, model: "__policy_test__", puzzleId: "__policy_test__" };
saveRunToDb(retry);
saveRunToDb({ ...retry, status: "success", correct: true, rawOutput: "retried" });
saveRunToDb({ ...retry, status: "failed", rawOutput: "blocked" });
check = read();
const final = check.query<{ status: string; raw_output: string }, [string]>("SELECT status, raw_output FROM runs WHERE model = ?").get(retry.model);
assert.deepEqual(final, { status: "success", raw_output: "retried" });
check.close();
console.log("Success rows preserved; failed rows retried; later writes blocked.");
