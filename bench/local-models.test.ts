import { afterAll, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// constants.ts resolves the registry path at module load, and bun test shares one
// module registry across test files, so probe it in a child process with the env
// set. Never call registerLocalModel in-process: bench/local-models.json holds the
// developer's own servers, and a test must not write to it.
const dir = mkdtempSync(join(tmpdir(), "nonobench-local-models-"));
const registryPath = join(dir, "local-models.json");
const seededRegistry = {
  "Registry-Only": { baseURL: "http://127.0.0.1:9/v1", family: "Registry-Only", effort: "xhigh" },
  "Env-Override": { baseURL: "http://127.0.0.1:9/v1", family: "Env-Override", effort: "low" },
};
writeFileSync(registryPath, `${JSON.stringify(seededRegistry, null, 2)}\n`);

const localEnv = (registry: string): Record<string, string> => ({
  NONOBENCH_LOCAL_MODELS_JSON: registry,
  NONOBENCH_LOCAL_BASE_URL: "http://127.0.0.1:9/v1",
  NONOBENCH_LOCAL_MODEL: "Env-Override",
  NONOBENCH_LOCAL_EFFORT: "high",
});

afterAll(() => rmSync(dir, { recursive: true, force: true }));

type Probe = { exitCode: number; stdout: string; stderr: string };

// Run a snippet against constants.ts with the local-model env set. The snippet
// prints its findings as JSON on the last line.
const probe = (script: string, registry = registryPath): Probe => {
  const constantsPath = join(import.meta.dir, "constants.ts");
  const proc = Bun.spawnSync({
    cmd: ["bun", "-e", `const m = await import(${JSON.stringify(constantsPath)});\n${script}`],
    cwd: import.meta.dir,
    env: { ...process.env, ...localEnv(registry) },
    stdout: "pipe",
    stderr: "pipe",
  });
  return {
    exitCode: proc.exitCode,
    stdout: new TextDecoder().decode(proc.stdout),
    stderr: new TextDecoder().decode(proc.stderr),
  };
};

const probeJson = (script: string, registry = registryPath): any => {
  const result = probe(script, registry);
  if (result.exitCode !== 0) throw new Error(`probe failed: ${result.stderr}`);
  return JSON.parse(result.stdout);
};

const findModel = `
const find = (name) => m.MODELS.find((model) => model.name === name);
`;

test("a registry entry joins MODELS as a local model, with no provider pin", () => {
  const out = probeJson(`${findModel}
const model = find("Registry-Only");
console.log(JSON.stringify({
  local: model.local,
  fromRegistry: model.fromRegistry,
  effort: model.effort,
  outputMode: model.outputMode,
  provider: m.pinnedProviderFor(model),
  options: m.requestProviderOptions(model),
}));`);
  expect(out.local).toBe(true);
  expect(out.fromRegistry).toBe(true);
  expect(out.effort).toBe("xhigh");
  expect(out.outputMode).toBe("text");
  expect(out.provider).toBe("local");
  expect(out.options).toEqual({});
});

test("env vars beat a registry entry with the same name", () => {
  const out = probeJson(`${findModel}
const model = find("Env-Override");
console.log(JSON.stringify({ fromRegistry: model.fromRegistry, effort: model.effort }));`);
  expect(out.fromRegistry).toBeUndefined();
  expect(out.effort).toBe("high");
});

test("registerLocalModel round-trips and keeps the other entries", () => {
  const out = probeJson(`
await m.registerLocalModel({
  name: "Fresh-Model", family: "Fresh-Model", effort: "medium",
  reasoning: false, local: true, localBaseURL: "http://127.0.0.1:9999/v1",
});
console.log(JSON.stringify({
  fresh: m.localRegistryEntryFor("Fresh-Model"),
  kept: m.localRegistryEntryFor("Registry-Only"),
}));`);
  expect(out.fresh).toEqual({
    baseURL: "http://127.0.0.1:9999/v1",
    family: "Fresh-Model",
    effort: "medium",
  });
  expect(out.kept).toEqual({
    baseURL: "http://127.0.0.1:9/v1",
    family: "Registry-Only",
    effort: "xhigh",
  });
});

test("an absent registry is empty, not an error", () => {
  const out = probeJson(`console.log(JSON.stringify(m.localRegistryEntryFor("Never-Benched") ?? null));`, join(dir, "absent.json"));
  expect(out).toBeNull();
});

test("a malformed registry fails loudly, not as an empty registry", () => {
  const brokenPath = join(dir, "broken.json");
  writeFileSync(brokenPath, "{ truncated");
  const result = probe(`console.log(JSON.stringify(m.localRegistryEntryFor("Registry-Only") ?? null));`, brokenPath);
  expect(result.exitCode).not.toBe(0);
  expect(result.stderr).toContain("not valid JSON");
});

const scratchExport = (dbFile: string, model: string) => {
  const dbPath = join(dir, dbFile);
  copyFileSync(join(import.meta.dir, "results.db"), dbPath);
  const db = new Database(dbPath);
  db.run(
    "INSERT INTO runs (model, puzzle_id, size, timestamp, correct, status, duration_ms, tokens, cost, output_mode) VALUES (?, 'p1', '5x5', '2026-09-28T00:00:00.000Z', 1, 'success', 1000, 10, 0, 'text')",
    [model],
  );
  db.close();
  const paths = {
    NONOBENCH_RESULTS_JSON: join(dir, `${dbFile}.results.json`),
    NONOBENCH_RESULTS_RAW_JSON: join(dir, `${dbFile}.results-raw.json`),
    NONOBENCH_PUZZLE_RESULTS_JSON: join(dir, `${dbFile}.puzzle-results.json`),
  };
  const proc = Bun.spawnSync({
    cmd: ["bun", "run", "export.ts"],
    cwd: import.meta.dir,
    env: { ...process.env, ...localEnv(registryPath), NONOBENCH_DB: dbPath, ...paths },
    stdout: "ignore",
    stderr: "pipe",
  });
  return { proc, paths };
};

test("export refuses an unknown model instead of calling it local", () => {
  const { proc } = scratchExport("ghost.db", "Ghost-9B");
  expect(proc.exitCode).not.toBe(0);
  expect(new TextDecoder().decode(proc.stderr)).toContain("Cannot export unknown DB model: Ghost-9B");
});

test("export labels a model the registry knows as local", () => {
  const { proc, paths } = scratchExport("registry.db", "Registry-Only");
  const stderr = new TextDecoder().decode(proc.stderr);
  expect(stderr).toBe("");
  expect(proc.exitCode).toBe(0);
  const summary = JSON.parse(readFileSync(paths.NONOBENCH_RESULTS_JSON, "utf8"));
  const model = summary.byModel.find((candidate: { model: string }) => candidate.model === "Registry-Only");
  expect(model.provider).toBe("local");
  expect(model.effort).toBe("xhigh");
  expect(model.reasoning).toBe(false);
  // The catalog has no entry for a model you serve yourself; its weights are open.
  expect(model.openWeights).toBe(true);
});
