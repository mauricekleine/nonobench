import { expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { copyFileSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

test("temp export preserves committed fields and gives each variant one version", () => {
  const dir = mkdtempSync(join(tmpdir(), "nonobench-export-"));
  try {
    const dbPath = join(dir, "results.db");
    copyFileSync(join(import.meta.dir, "results.db"), dbPath);
    const paths = {
      results: join(dir, "results.json"),
      raw: join(dir, "results-raw.json"),
      puzzle: join(dir, "puzzle-results.json"),
    };
    const process = Bun.spawnSync({
      cmd: ["bun", "run", "export.ts"],
      cwd: import.meta.dir,
      env: {
        ...globalThis.process.env,
        NONOBENCH_DB: dbPath,
        NONOBENCH_RESULTS_JSON: paths.results,
        NONOBENCH_RESULTS_RAW_JSON: paths.raw,
        NONOBENCH_PUZZLE_RESULTS_JSON: paths.puzzle,
      },
      stdout: "ignore",
      stderr: "pipe",
    });
    expect(new TextDecoder().decode(process.stderr)).toBe("");
    expect(process.exitCode).toBe(0);

    const oldSummary = JSON.parse(readFileSync(join(import.meta.dir, "../visualizer/app/results.json"), "utf8"));
    const oldRaw = JSON.parse(readFileSync(join(import.meta.dir, "../visualizer/public/results-raw.json"), "utf8"));
    const summary = JSON.parse(readFileSync(paths.results, "utf8"));
    const raw = JSON.parse(readFileSync(paths.raw, "utf8"));
    // The checked-in exports predate the integrated grader repair: five raw
    // answers now grade correctly, which also changes four summary scores and
    // their sort order. Keep that known drift separate from this export change.
    const additions = new Set(["harness", "version", "reasoningTokens", "finishReason", "providerName", "quantization", "generationId"]);
    let correctedRawRuns = 0;
    const compare = (before: any, after: any, path = "root") => {
      if (Array.isArray(before)) {
        expect(after.length).toBe(before.length);
        const key = path === "root.summary.models" ? (value: any) => value
          : path === "root.byModel" ? (value: any) => value.model
          : path === "root.chartData" ? (value: any) => `${value.model}\u0000${value.size}`
          : null;
        const left = key ? [...before].sort((a, b) => key(a).localeCompare(key(b))) : before;
        const right = key ? [...after].sort((a, b) => key(a).localeCompare(key(b))) : after;
        left.forEach((value, index) => compare(value, right[index], `${path}[${index}]`));
      } else if (before !== null && typeof before === "object") {
        for (const key of Object.keys(before)) compare(before[key], after[key], `${path}.${key}`);
        for (const key of Object.keys(after)) if (!(key in before)) expect(additions.has(key)).toBe(true);
      } else if (path !== "root.timestamp") {
        if (/^root\.runs\[\d+\]\.correct$/.test(path) && before === false && after === true) {
          correctedRawRuns++;
          return;
        }
        if (/^root\.(?:byModel|chartData)\[\d+\]\.(?:overallCorrect|overallAccuracy|correct|accuracy|bySize\[\d+\]\.(?:correct|accuracy))$/.test(path)
          && typeof before === "number" && typeof after === "number" && after >= before) return;
        expect(after).toEqual(before);
      }
    };
    compare(oldSummary, summary);
    compare(oldRaw, raw);
    expect(correctedRawRuns).toBe(5);

    const db = new Database(dbPath, { readonly: true, create: false });
    const first = new Map(db.query<{ model: string; first_run: string }, []>("SELECT model, MIN(timestamp) AS first_run FROM runs GROUP BY model").all().map((row) => [row.model, row.first_run]));
    db.close();
    const expectedVersion = (model: string) => {
      const timestamp = first.get(model)!;
      return timestamp < "2026-02-01" ? "1.0" : timestamp < "2026-09-01" ? "1.1" : "1.2";
    };
    for (const model of summary.byModel) expect(model.version).toBe(expectedVersion(model.model));
    for (const run of raw.runs) {
      expect(run.version).toBe(expectedVersion(run.model));
      expect(run.reasoningTokens === null || typeof run.reasoningTokens === "number").toBe(true);
      expect(run.finishReason).toBeNull(); // committed DB predates finish-reason capture
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
