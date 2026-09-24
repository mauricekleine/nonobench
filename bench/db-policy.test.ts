import { expect, test } from "bun:test";
import { copyFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

test("database writes preserve successful rows and retry failures", () => {
  const dir = mkdtempSync(join(tmpdir(), "nonobench-policy-"));
  try {
    const path = join(dir, "results.db");
    copyFileSync(join(import.meta.dir, "results.db"), path);
    const result = Bun.spawnSync({
      cmd: ["bun", "run", "db-policy-check.ts"],
      cwd: import.meta.dir,
      env: { ...process.env, NONOBENCH_DB: path },
    });
    expect(new TextDecoder().decode(result.stderr)).toBe("");
    expect(result.exitCode).toBe(0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
