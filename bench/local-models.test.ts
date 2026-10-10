import { afterAll, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// constants.ts resolves the registry path at module load, and bun test shares one
// module registry across test files, so probe it in a child process with the env
// set. Never call registerLocalModel in-process: bench/local-models.json holds the
// developer's own servers, and a test must not write to it.
const dir = mkdtempSync(join(tmpdir(), "nonobench-local-models-"));
const registryPath = join(dir, "local-models.json");
const seededRegistry = {
  "Registry-Only": {
    baseURL: "http://127.0.0.1:9/v1",
    modelId: "registry-32b",
    family: "Registry-Only",
    effort: "xhigh",
  },
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
const probe = (
  script: string,
  registry = registryPath,
  extraEnv: Record<string, string> = {},
): Probe => {
  const constantsPath = join(import.meta.dir, "constants.ts");
  const proc = Bun.spawnSync({
    cmd: ["bun", "-e", `const m = await import(${JSON.stringify(constantsPath)});\n${script}`],
    cwd: import.meta.dir,
    env: { ...process.env, ...localEnv(registry), ...extraEnv },
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
  modelId: model.llm.modelId,
  effort: model.effort,
  outputMode: model.outputMode,
  provider: m.pinnedProviderFor(model),
  options: m.requestProviderOptions(model),
}));`);
  expect(out.local).toBe(true);
  expect(out.fromRegistry).toBe(true);
  // The server's model id is what the runner requests, not the display name.
  expect(out.modelId).toBe("registry-32b");
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
  llm: { modelId: "fresh-32b" },
});
console.log(JSON.stringify({
  fresh: m.localRegistryEntryFor("Fresh-Model"),
  kept: m.localRegistryEntryFor("Registry-Only"),
}));`);
  expect(out.fresh).toEqual({
    baseURL: "http://127.0.0.1:9999/v1",
    modelId: "fresh-32b",
    family: "Fresh-Model",
    effort: "medium",
  });
  expect(out.kept).toEqual({
    baseURL: "http://127.0.0.1:9/v1",
    modelId: "registry-32b",
    family: "Registry-Only",
    effort: "xhigh",
  });
});

test("an absent registry is empty, not an error", () => {
  const out = probeJson(
    `console.log(JSON.stringify(m.localRegistryEntryFor("Never-Benched") ?? null));`,
    join(dir, "absent.json"),
  );
  expect(out).toBeNull();
});

test("a malformed registry fails loudly, not as an empty registry", () => {
  const brokenPath = join(dir, "broken.json");
  writeFileSync(brokenPath, "{ truncated");
  const result = probe(
    `console.log(JSON.stringify(m.localRegistryEntryFor("Registry-Only") ?? null));`,
    brokenPath,
  );
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
  expect(new TextDecoder().decode(proc.stderr)).toContain(
    "Cannot export unknown DB model: Ghost-9B",
  );
});

test("export labels a model the registry knows as local", () => {
  const { proc, paths } = scratchExport("registry.db", "Registry-Only");
  const stderr = new TextDecoder().decode(proc.stderr);
  expect(stderr).toBe("");
  expect(proc.exitCode).toBe(0);
  const summary = JSON.parse(readFileSync(paths.NONOBENCH_RESULTS_JSON, "utf8"));
  const model = summary.byModel.find(
    (candidate: { model: string }) => candidate.model === "Registry-Only",
  );
  expect(model.provider).toBe("local");
  expect(model.effort).toBe("xhigh");
  // reasoning is DB-driven (this scratch row stored no reasoning flag); the registry's effort only feeds the synthesized metadata.
  expect(model.reasoning).toBe(false);
  // The catalog has no entry for a model you serve yourself; its weights are open.
  expect(model.openWeights).toBe(true);
});

test("a local name that shadows a cloud model fails loudly", () => {
  const result = probe(`console.log(JSON.stringify(m.MODELS.length));`, registryPath, {
    NONOBENCH_LOCAL_NAME: "qwen3.8-27b-low",
  });
  expect(result.exitCode).not.toBe(0);
  expect(result.stderr).toContain("shadows a cloud model");
});

test("a registry entry that shadows a cloud model fails loudly", () => {
  const shadowedPath = join(dir, "shadowed.json");
  writeFileSync(
    shadowedPath,
    `${JSON.stringify({ "qwen3.8-27b-low": { baseURL: "http://127.0.0.1:9/v1" } }, null, 2)}\n`,
  );
  const result = probe(`console.log(JSON.stringify(m.MODELS.length));`, shadowedPath);
  expect(result.exitCode).not.toBe(0);
  expect(result.stderr).toContain("shadows a cloud model");
});

// A minimal OpenAI-compatible server: it lists models and answers every chat
// completion with a fixed (wrong) answer.
const fakeServer = (modelIds: string[]) =>
  Bun.serve({
    port: 0,
    fetch: (request) => {
      const url = new URL(request.url);
      if (url.pathname === "/v1/models") {
        return Response.json({ data: modelIds.map((id) => ({ id, object: "model" })) });
      }
      if (url.pathname === "/v1/chat/completions") {
        return Response.json({
          id: "chatcmpl-fake",
          object: "chat.completion",
          created: 0,
          model: modelIds[0] ?? "fake",
          choices: [
            {
              index: 0,
              message: { role: "assistant", content: "not a real answer" },
              finish_reason: "stop",
            },
          ],
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        });
      }
      return new Response("not found", { status: 404 });
    },
  });

// Async on purpose: the fake server lives in this process, and a synchronous
// spawn would block the event loop it serves on.
const runBench = async (args: string[], env: Record<string, string> = {}) => {
  const proc = Bun.spawn({
    cmd: ["bun", "run", "bench.ts", ...args],
    cwd: import.meta.dir,
    env: { ...process.env, ...localEnv(registryPath), ...env },
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  return { exitCode, stdout, stderr };
};

test("bench refuses to write a local model to the shared database, however it is spelled", async () => {
  // The guard exits before the server check, so the unreachable server in localEnv is never called.
  for (const db of [undefined, "results.db", "./results.db", join(import.meta.dir, "results.db")]) {
    const out = await runBench(
      ["--model", "Env-Override"],
      db === undefined ? {} : { NONOBENCH_DB: db },
    );
    expect(out.exitCode).toBe(1);
    expect(out.stderr).toContain("Local models write to their own database");
  }
}, 30000);

test("bench refuses a model id the server does not serve", async () => {
  const server = fakeServer(["real-model"]);
  try {
    const out = await runBench(["--model", "typo-model"], {
      NONOBENCH_LOCAL_BASE_URL: `http://127.0.0.1:${server.port}/v1`,
      NONOBENCH_LOCAL_MODEL: "typo-model",
      NONOBENCH_DB: join(dir, "typo.db"),
    });
    expect(out.exitCode).toBe(1);
    expect(out.stderr).toContain("has no model 'typo-model'");
    expect(out.stderr).toContain("real-model");
  } finally {
    server.stop();
  }
}, 30000);

test("bench refuses to start when the server is unreachable", async () => {
  // localEnv points at 127.0.0.1:9, where nothing listens.
  const out = await runBench(["--model", "Env-Override"], {
    NONOBENCH_DB: join(dir, "unreachable.db"),
  });
  expect(out.exitCode).toBe(1);
  expect(out.stderr).toContain("Cannot reach");
}, 30000);

test("bench runs a model the server lists", async () => {
  const server = fakeServer(["fake-32b"]);
  try {
    const out = await runBench(["--model", "fake-32b", "--sizes", "5x5", "--limit", "1"], {
      NONOBENCH_LOCAL_BASE_URL: `http://127.0.0.1:${server.port}/v1`,
      NONOBENCH_LOCAL_MODEL: "fake-32b",
      NONOBENCH_DB: join(dir, "fake.db"),
    });
    expect(out.exitCode).toBe(0);
    const db = new Database(join(dir, "fake.db"));
    const rows = db.query<{ model: string }, []>("SELECT model FROM runs").all();
    db.close();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.model).toBe("fake-32b");
  } finally {
    server.stop();
  }
}, 30000);

test("dev-local refuses to start over uncommitted export edits", () => {
  const repo = mkdtempSync(join(tmpdir(), "nonobench-dev-local-"));
  const gitEnv = {
    ...process.env,
    GIT_AUTHOR_NAME: "test",
    GIT_AUTHOR_EMAIL: "test@example.com",
    GIT_COMMITTER_NAME: "test",
    GIT_COMMITTER_EMAIL: "test@example.com",
  };
  const git = (args: string[]) =>
    Bun.spawnSync({
      cmd: ["git", ...args],
      cwd: repo,
      env: gitEnv,
      stdout: "pipe",
      stderr: "pipe",
    });
  const runScript = () => {
    const proc = Bun.spawnSync({
      cmd: ["bash", "visualizer/dev-local.sh"],
      cwd: repo,
      env: gitEnv,
      stdout: "pipe",
      stderr: "pipe",
    });
    return { exitCode: proc.exitCode, stderr: new TextDecoder().decode(proc.stderr) };
  };

  mkdirSync(join(repo, "visualizer/app"), { recursive: true });
  mkdirSync(join(repo, "visualizer/public"), { recursive: true });
  mkdirSync(join(repo, "bench"), { recursive: true });
  copyFileSync(
    join(import.meta.dir, "..", "visualizer", "dev-local.sh"),
    join(repo, "visualizer", "dev-local.sh"),
  );
  for (const file of [
    "visualizer/app/results.json",
    "visualizer/public/results-raw.json",
    "visualizer/public/puzzle-results.json",
  ]) {
    writeFileSync(join(repo, file), "{}\n");
  }
  writeFileSync(join(repo, "bench", "local-results.db"), "");
  git(["init", "-q"]);
  git(["add", "-A"]);
  git(["commit", "-qm", "seed"]);

  writeFileSync(join(repo, "visualizer/app/results.json"), "{} local edit\n");
  const refused = runScript();
  expect(refused.exitCode).toBe(1);
  expect(refused.stderr).toContain("commit or stash");

  git(["add", "-A"]);
  git(["commit", "-qm", "commit the edit"]);
  const started = runScript();
  // Past the dirty check; the export step fails in this bare repo, which is fine.
  expect(started.stderr).not.toContain("commit or stash");
  rmSync(repo, { recursive: true, force: true });
});
