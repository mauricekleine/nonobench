import { Database } from "bun:sqlite";
import { resolve } from "node:path";
import { MODELS } from "./constants";
import { quantizationFor } from "./provider-pins";

const path = process.env.NONOBENCH_DB;
if (!path) throw new Error("Set NONOBENCH_DB explicitly to the database to backfill");
const csvPath = process.argv[2] ?? process.env.NONOBENCH_ACTIVITY_CSV
  ?? "/private/tmp/claude-501/-Users-maurice-Projects-nonobench/1a8972a5-ea54-4051-8b17-8cf810766a7a/scratchpad/activity.csv";

function parseCsv(line: string): string[] {
  const fields: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (char === "," && !quoted) {
      fields.push(field);
      field = "";
    } else field += char;
  }
  fields.push(field);
  return fields;
}

const csv = (await Bun.file(csvPath).text()).trim().split(/\r?\n/).map(parseCsv);
const headers = csv.shift();
if (!headers) throw new Error("Empty activity CSV");
for (const name of ["generation_id", "created_at", "tokens_completion", "model_permaslug", "provider_name", "cancelled"]) {
  if (!headers.includes(name)) throw new Error(`Activity CSV lacks ${name}`);
}
const activity = csv.map((fields) => Object.fromEntries(headers.map((header, index) => [header, fields[index] ?? ""])))
  .filter((row) => (row.cancelled ?? "").toLowerCase() === "false" && row.generation_id && row.provider_name)
  .map((row) => ({
    id: row.generation_id ?? "",
    model: (row.model_permaslug ?? "").replace(/-\d{8}$/, ""),
    provider: row.provider_name ?? "",
    tokens: Number(row.tokens_completion),
    time: Date.parse((row.created_at ?? "").replace(" ", "T") + "Z"),
  })).filter((row) => Number.isFinite(row.time) && Number.isFinite(row.tokens));

const modelByName = new Map(MODELS.map((model) => [model.name, model] as const));
const activityModelFor = (model: (typeof MODELS)[number]) => {
  const author = model.llm.modelId.split("/")[0];
  const family = model.family === "seed-2.1-turbo" ? "seed-2-1-turbo" : model.family;
  return `${author}/${family}`;
};
type Run = { id: number; model: string; timestamp: string; duration_ms: number; tokens: number };
const db = new Database(resolve(path), { create: false, readwrite: true });
try {
  const columns = new Set(db.query<{ name: string }, []>("PRAGMA table_info(runs)").all().map((column) => column.name));
  for (const column of ["provider_name", "quantization", "generation_id"] as const) {
    if (!columns.has(column)) db.run(`ALTER TABLE runs ADD COLUMN ${column} TEXT`);
  }
  const runs = db.query<Run, []>("SELECT id, model, timestamp, duration_ms, tokens FROM runs WHERE output_mode IS NOT NULL AND provider_name IS NULL ORDER BY timestamp").all();
  const activityLatest = Math.max(...activity.map((item) => item.time));
  const withinActivityWindow = runs.filter((run) => Date.parse(run.timestamp) - run.duration_ms <= activityLatest).length;
  const used = new Set<string>();
  const matched: Array<{ run: number; provider: string; quantization: string | null; generation: string }> = [];
  let unknownModel = 0;
  for (const run of runs) {
    const model = modelByName.get(run.model);
    if (!model) { unknownModel++; continue; }
    const modelId = model.llm.modelId;
    const start = Date.parse(run.timestamp) - run.duration_ms;
    const candidates = activity.filter((item) => !used.has(item.id) && item.model === activityModelFor(model)
      && item.tokens === run.tokens && Math.abs(item.time - start) <= 120_000);
    candidates.sort((a, b) => Math.abs(a.time - start) - Math.abs(b.time - start));
    const best = candidates[0];
    if (!best) continue;
    used.add(best.id);
    matched.push({ run: run.id, provider: best.provider, quantization: quantizationFor(modelId, best.provider), generation: best.id });
  }
  db.transaction(() => {
    const update = db.query("UPDATE runs SET provider_name = ?, quantization = ?, generation_id = ? WHERE id = ? AND output_mode IS NOT NULL AND provider_name IS NULL");
    for (const item of matched) update.run(item.provider, item.quantization, item.generation, item.run);
  })();
  console.log(JSON.stringify({ database: resolve(path), eligible: runs.length, matched: matched.length,
    unmatched: runs.length - matched.length, unknownModel, quantizationKnown: matched.filter((item) => item.quantization && item.quantization !== "unknown").length,
    withinActivityWindow, unmatchedWithinActivityWindow: withinActivityWindow - matched.length,
    activityRows: activity.length, activityLatest: new Date(activityLatest).toISOString() }, null, 2));
} finally {
  db.close();
}
