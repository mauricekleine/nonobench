import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { cluesForGrid, solveByLines } from "./line-solver";

const SIZE = 20;
const SEED = 20260924;
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

type Shape = { x: number; y: number; rx: number; ry: number; kind: "ellipse" | "rect" | "diamond" };
function inside(shape: Shape, x: number, y: number): boolean {
  const dx = Math.abs((x - shape.x) / shape.rx);
  const dy = Math.abs((y - shape.y) / shape.ry);
  if (shape.kind === "ellipse") return dx * dx + dy * dy <= 1;
  if (shape.kind === "diamond") return dx + dy <= 1;
  return Math.max(dx, dy) <= 1;
}

function candidate(): string {
  const kind = integer(0, 2);
  const symmetry = random() < 0.55;
  const additions: Shape[] = [];
  const cutouts: Shape[] = [];
  const count = integer(2, 5);
  for (let i = 0; i < count; i++) {
    additions.push({
      x: between(3, symmetry ? 10 : 17), y: between(2, 17),
      rx: between(2.8, 8.2), ry: between(2.8, 8.2),
      kind: ["ellipse", "rect", "diamond"][kind === 2 ? integer(0, 2) : kind] as Shape["kind"],
    });
  }
  for (let i = 0; i < integer(0, 2); i++) {
    cutouts.push({ x: between(4, symmetry ? 10 : 15), y: between(4, 15),
      rx: between(1.1, 4.4), ry: between(1.1, 4.4), kind: random() < 0.7 ? "ellipse" : "rect" });
  }
  const value = (x: number, y: number) =>
    additions.some((shape) => inside(shape, x, y)) && !cutouts.some((shape) => inside(shape, x, y));
  const pixels: string[] = [];
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      pixels.push(value(symmetry ? Math.min(x, SIZE - 1 - x) : x, y) ? "1" : "0");
    }
  }
  return pixels.join("");
}

type Accepted = { solution: string; density: number; sweeps: number; firstPass: number; unknown: number; attempt: number; id: string; lineSolvable: boolean; cppTimeMs?: number };
function itemFor(solution: string, attempt: number): Accepted | null {
  const filled = solution.split("1").length - 1;
  if (filled < 180 || filled > 260) return null;
  const { rows, columns } = cluesForGrid(solution, SIZE, SIZE);
  if (rows.some((runs) => runs.length === 0) || columns.some((runs) => runs.length === 0)) return null;
  const result = solveByLines(SIZE, SIZE, rows, columns);
  if (result.solved && result.grid !== solution) throw new Error(`Line solver disagreed at candidate ${attempt}`);
  return { solution, density: filled / 400, sweeps: result.sweeps,
    firstPass: result.undeterminedAfterFirstPass, unknown: result.grid.split("?").length - 1,
    attempt, id: createHash("md5").update(solution).digest("hex").slice(0, 16), lineSolvable: result.solved };
}

function hamming(a: string, b: string): number {
  return Array.from(a).reduce((n, bit, index) => n + Number(bit !== b[index]), 0);
}

// Reconstruct the original ten from the original seed, then retain their five
// hardest entries. This keeps regeneration independent of the output file.
const lineCandidates: Accepted[] = [];
const lineSeen = new Set<string>();
const started = performance.now();
let lineTried = 0;
for (; lineTried < MAX_LINE_CANDIDATES && lineCandidates.length < 100; lineTried++) {
  const solution = candidate();
  if (lineSeen.has(solution)) continue;
  lineSeen.add(solution);
  const item = itemFor(solution, lineTried + 1);
  if (item?.lineSolvable) lineCandidates.push(item);
}
if (lineCandidates.length < 100) throw new Error(`Only ${lineCandidates.length} original candidates after ${lineTried} attempts`);

lineCandidates.sort((a, b) => a.firstPass - b.firstPass || a.sweeps - b.sweeps || a.attempt - b.attempt);
const original: Accepted[] = [];
for (let slot = 0; slot < 10; slot++) {
  const target = Math.round((slot + 0.5) * lineCandidates.length / 10);
  const ordered = lineCandidates.map((item, index) => ({ item, distance: Math.abs(index - target) }))
    .sort((a, b) => a.distance - b.distance || a.item.attempt - b.item.attempt);
  const pick = ordered.find(({ item }) => !original.includes(item) &&
    original.every((other) => hamming(item.solution, other.solution) >= 60));
  if (!pick) throw new Error(`Could not select distinct candidate for slot ${slot}`);
  original.push(pick.item);
}
const kept = original.sort((a, b) => a.firstPass - b.firstPass || a.sweeps - b.sweeps).slice(-TARGET_PER_KIND);

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

state = SEED;
const deep: Accepted[] = [];
const deepSeen = new Set<string>();
let deepTried = 0;
for (; deepTried < MAX_DEEP_CANDIDATES && deep.length < TARGET_PER_KIND; deepTried++) {
  const solution = candidate();
  if (deepSeen.has(solution)) continue;
  deepSeen.add(solution);
  const item = itemFor(solution, deepTried + 1);
  if (!item || item.lineSolvable || item.density < 0.475 || item.unknown < 40 || item.unknown > 120) continue;
  if ([...kept, ...deep].some((other) => hamming(item.solution, other.solution) < 60)) continue;
  const { rows, columns } = cluesForGrid(item.solution, SIZE, SIZE);
  const result = spawnSync(SOLVER, ["--check-unique", "-"], {
    input: JSON.stringify({ rows, columns }), encoding: "utf8", timeout: 30000,
  });
  if (result.status !== 0) throw new Error(`Uniqueness solver failed at candidate ${item.attempt}: ${result.error ?? result.stderr}`);
  const check = JSON.parse(result.stdout) as { solved: boolean; unique: boolean; lineSolvable: boolean; solution?: string; timeMs: number };
  if (!check.solved || !check.unique) continue;
  if (check.solution !== item.solution || check.lineSolvable) throw new Error(`C++ solver disagreed at candidate ${item.attempt}`);
  item.cppTimeMs = check.timeMs;
  deep.push(item);
}
if (deep.length !== TARGET_PER_KIND) throw new Error(`Only ${deep.length} deep candidates after ${deepTried} attempts`);
const chosen = [...kept, ...deep];

function formatPuzzle(item: Accepted): string {
  const { rows, columns } = cluesForGrid(item.solution, SIZE, SIZE);
  const rowLines = rows.map((runs, index) => `          Row ${index + 1}: ${runs.join(" ")}`).join("\n");
  const columnLines = columns.map((runs, index) => `          Column ${index + 1}: ${runs.join(" ")}`).join("\n");
  const difficulty = item.lineSolvable
    ? `${item.sweeps} sweeps, ${item.firstPass} unresolved after first pass`
    : `${item.unknown} unresolved after full line propagation`;
  return `  // ${item.id}: ${(item.density * 100).toFixed(1)}% filled, ${difficulty}\n  {\n    clues: {\n      canonical: codeBlock\`\n        Row clues:\n${rowLines}\n\n        Column clues:\n${columnLines}\n      \`,\n    },\n    height: 20,\n    width: 20,\n    solution: "${item.solution}",\n  },`;
}
const source = `import { codeBlock } from "common-tags";\nimport type { Puzzle } from "./types";\n\n// Generated by bun run generate-puzzles (seed ${SEED}).\nexport const PUZZLES_20X20: Puzzle[] = [\n${chosen.map(formatPuzzle).join("\n")}\n];\n`;
await mkdir(fileURLToPath(new URL("../visualizer/components/puzzles/", import.meta.url)), { recursive: true });
await writeFile(OUTPUT, source);
console.log(`Generated ${chosen.length} puzzles (${kept.length} kept, ${deep.length} deep) from ${lineTried + deepTried} candidates in ${((performance.now() - started) / 1000).toFixed(2)}s`);
for (const item of chosen) console.log(`${item.id} ${item.lineSolvable ? "kept" : "new"} density=${(item.density * 100).toFixed(1)}% lineSolvable=${item.lineSolvable} firstPass=${item.firstPass} unknown=${item.unknown} sweeps=${item.sweeps} cppTimeMs=${item.cppTimeMs?.toFixed(3)} candidate=${item.attempt}`);
