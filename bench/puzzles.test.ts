import { expect, test } from "bun:test";

for (let index = 0; index < 40; index++) {
  test(`puzzle ${index + 1} has valid clues and its pinned solution count`, () => {
    const result = Bun.spawnSync({ cmd: ["bun", "run", "puzzles-check.ts", String(index)], cwd: import.meta.dir });
    const output = new TextDecoder().decode(result.stdout).trim();
    console.log(output);
    expect(new TextDecoder().decode(result.stderr)).toBe("");
    expect(result.exitCode).toBe(0);
  }, index >= 20 && index < 30 ? 20_000 : 5_000); // Exhaustive 15x15 ambiguity checks can take >5 seconds.
}
