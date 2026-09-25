import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { cluesForGrid, solveByLines } from "./line-solver";

const SIZE = 20;
const SEED = 20260926;
const TARGET_PER_KIND = 5;
const MAX_LINE_CANDIDATES = 20000;
const MAX_DEEP_CANDIDATES = 100000;
const SOLVER = process.env.NONOGRAM_SOLVER ?? "/Users/maurice/Projects/nonogram-solver/build/nonogram_hybrid";
const OUTPUT = fileURLToPath(new URL("../visualizer/components/puzzles/puzzles-20x20.ts", import.meta.url));

// Xorshift32 keeps the output stable across Bun and Node versions.
let state = SEED;
function random(): number {
  state ^= state << 13;
  state ^= state >>> 17;
  state ^= state << 5;
  return (state >>> 0) / 2 ** 32;
}
function between(min: number, max: number): number { return min + random() * (max - min); }
function integer(min: number, max: number): number { return Math.floor(between(min, max + 1)); }

// Random fills, not pictures: smooth symmetric shapes let a model complete the
// picture instead of solving the clues (see LEARNINGS.md). Density varies a
// little so the set spans block lengths.
function candidate(): string {
  const density = between(0.5, 0.66);
  let pixels = "";
  for (let i = 0; i < SIZE * SIZE; i++) pixels += random() < density ? "1" : "0";
  return pixels;
}

// Share of cells equal to their mirror image (left-right or top-bottom,
// whichever is higher). Random grids sit near 0.5.
function symmetry(solution: string): number {
  let horizontal = 0, vertical = 0;
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    const cell = solution[y * SIZE + x];
    if (cell === solution[y * SIZE + SIZE - 1 - x]) horizontal++;
    if (cell === solution[(SIZE - 1 - y) * SIZE + x]) vertical++;
  }
  return Math.max(horizontal, vertical) / (SIZE * SIZE);
}

type Accepted = { solution: string; density: number; sweeps: number; firstPass: number; unknown: number; attempt: number; id: string; lineSolvable: boolean; blocksPerLine: number; symmetry: number; cppTimeMs?: number };
function itemFor(solution: string, attempt: number): Accepted | null {
  const filled = solution.split("1").length - 1;
  if (filled < 190 || filled > 270) return null;
  const { rows, columns } = cluesForGrid(solution, SIZE, SIZE);
  if (rows.some((runs) => runs.length === 0) || columns.some((runs) => runs.length === 0)) return null;
  const blocksPerLine = [...rows, ...columns].reduce((sum, runs) => sum + runs.length, 0) / (2 * SIZE);
  const mirror = symmetry(solution);
  if (blocksPerLine < 3 || mirror > 0.6) return null;
  const result = solveByLines(SIZE, SIZE, rows, columns);
  if (result.solved && result.grid !== solution) throw new Error(`Line solver disagreed at candidate ${attempt}`);
  return { solution, density: filled / 400, sweeps: result.sweeps,
    firstPass: result.undeterminedAfterFirstPass, unknown: result.grid.split("?").length - 1,
    attempt, id: createHash("md5").update(solution).digest("hex").slice(0, 16), lineSolvable: result.solved,
    blocksPerLine, symmetry: mirror };
}

function hamming(a: string, b: string): number {
  return Array.from(a).reduce((n, bit, index) => n + Number(bit !== b[index]), 0);
}

// Line-solvable half: collect candidates, then take five spread across the
// harder half by first-pass progress and sweeps.
const lineCandidates: Accepted[] = [];
const seen = new Set<string>();
const started = performance.now();
let lineTried = 0;
for (; lineTried < MAX_LINE_CANDIDATES && lineCandidates.length < 60; lineTried++) {
  const solution = candidate();
  if (seen.has(solution)) continue;
  seen.add(solution);
  const item = itemFor(solution, lineTried + 1);
  if (item?.lineSolvable) lineCandidates.push(item);
}
if (lineCandidates.length < 20) throw new Error(`Only ${lineCandidates.length} line-solvable candidates after ${lineTried} attempts`);
lineCandidates.sort((a, b) => a.firstPass - b.firstPass || a.sweeps - b.sweeps || a.attempt - b.attempt);
const harder = lineCandidates.slice(Math.floor(lineCandidates.length / 2));
const kept: Accepted[] = [];
for (let slot = 0; slot < TARGET_PER_KIND; slot++) {
  const target = Math.round((slot + 0.5) * harder.length / TARGET_PER_KIND);
  const pick = harder.map((item, index) => ({ item, distance: Math.abs(index - target) }))
    .sort((a, b) => a.distance - b.distance || a.item.attempt - b.item.attempt)
    .find(({ item }) => !kept.includes(item) && kept.every((other) => hamming(item.solution, other.solution) >= 60));
  if (!pick) throw new Error(`Could not select distinct line-solvable candidate for slot ${slot}`);
  kept.push(pick.item);
}

if (!existsSync(SOLVER)) throw new Error(`Uniqueness solver missing: ${SOLVER} (set NONOGRAM_SOLVER)`);
function verifyWithCpp(item: Accepted): void {
  const { rows, columns } = cluesForGrid(item.solution, SIZE, SIZE);
  const result = spawnSync(SOLVER, ["--check-unique", "-"], {
    input: JSON.stringify({ rows, columns }), encoding: "utf8", timeout: 30000,
  });
  if (result.status !== 0) throw new Error(`Uniqueness solver failed for ${item.id}: ${result.error ?? result.stderr}`);
  const check = JSON.parse(result.stdout) as { solved: boolean; unique: boolean; lineSolvable: boolean; solution: string; timeMs: number };
  if (!check.solved || !check.unique || check.solution !== item.solution || check.lineSolvable !== item.lineSolvable) {
    throw new Error(`C++ solver disagreed for ${item.id}: ${result.stdout}`);
  }
  item.cppTimeMs = check.timeMs;
}
for (const item of kept) verifyWithCpp(item);

const deepPool: Accepted[] = [];
let deepTried = 0;
for (; deepTried < MAX_DEEP_CANDIDATES && deepPool.length < 25; deepTried++) {
  const solution = candidate();
  if (seen.has(solution)) continue;
  seen.add(solution);
  const item = itemFor(solution, lineTried + deepTried + 1);
  // Deep, but not a wall: line logic stalls with 20–200 cells left.
  if (!item || item.lineSolvable || item.unknown < 20 || item.unknown > 200) continue;
  if ([...kept, ...deepPool].some((other) => hamming(item.solution, other.solution) < 60)) continue;
  const { rows, columns } = cluesForGrid(item.solution, SIZE, SIZE);
  const result = spawnSync(SOLVER, ["--check-unique", "-"], {
    input: JSON.stringify({ rows, columns }), encoding: "utf8", timeout: 30000,
  });
  if (result.status !== 0) throw new Error(`Uniqueness solver failed at candidate ${item.attempt}: ${result.error ?? result.stderr}`);
  const check = JSON.parse(result.stdout) as { solved: boolean; unique: boolean; lineSolvable: boolean; solution?: string; timeMs: number };
  if (!check.solved || !check.unique) continue;
  if (check.solution !== item.solution || check.lineSolvable) throw new Error(`C++ solver disagreed at candidate ${item.attempt}`);
  item.cppTimeMs = check.timeMs;
  deepPool.push(item);
}
if (deepPool.length < TARGET_PER_KIND) throw new Error(`Only ${deepPool.length} deep candidates after ${deepTried} attempts`);
// Spread the five across the pool by how much line logic leaves unresolved.
deepPool.sort((a, b) => a.unknown - b.unknown || a.attempt - b.attempt);
const deep = Array.from({ length: TARGET_PER_KIND }, (_, slot) => deepPool[Math.round((slot + 0.5) * deepPool.length / TARGET_PER_KIND - 0.5)]!);
const chosen = [...kept, ...deep];

function formatPuzzle(item: Accepted): string {
  const { rows, columns } = cluesForGrid(item.solution, SIZE, SIZE);
  const rowLines = rows.map((runs, index) => `          Row ${index + 1}: ${runs.join(" ")}`).join("\n");
  const columnLines = columns.map((runs, index) => `          Column ${index + 1}: ${runs.join(" ")}`).join("\n");
  const shape = `${item.blocksPerLine.toFixed(1)} blocks/line, ${(item.symmetry * 100).toFixed(0)}% mirror`;
  const difficulty = item.lineSolvable
    ? `${item.sweeps} sweeps, ${item.firstPass} unresolved after first pass`
    : `${item.unknown} unresolved after full line propagation`;
  return `  // ${item.id}: ${(item.density * 100).toFixed(1)}% filled, ${shape}, ${difficulty}\n  {\n    clues: {\n      canonical: codeBlock\`\n        Row clues:\n${rowLines}\n\n        Column clues:\n${columnLines}\n      \`,\n    },\n    height: 20,\n    width: 20,\n    solution: "${item.solution}",\n  },`;
}
const source = `import { codeBlock } from "common-tags";\nimport type { Puzzle } from "./types";\n\n// Generated by bun run generate-puzzles (seed ${SEED}).\nexport const PUZZLES_20X20: Puzzle[] = [\n${chosen.map(formatPuzzle).join("\n")}\n];\n`;
await mkdir(fileURLToPath(new URL("../visualizer/components/puzzles/", import.meta.url)), { recursive: true });
await writeFile(OUTPUT, source);
console.log(`Generated ${chosen.length} puzzles (${kept.length} line-solvable, ${deep.length} deep) from ${lineTried + deepTried} candidates in ${((performance.now() - started) / 1000).toFixed(2)}s`);
for (const item of chosen) console.log(`${item.id} ${item.lineSolvable ? "line" : "deep"} density=${(item.density * 100).toFixed(1)}% lineSolvable=${item.lineSolvable} firstPass=${item.firstPass} unknown=${item.unknown} sweeps=${item.sweeps} blocks/line=${item.blocksPerLine.toFixed(1)} mirror=${(item.symmetry * 100).toFixed(0)}% cppTimeMs=${item.cppTimeMs?.toFixed(3)} candidate=${item.attempt}`);
