import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { cluesForGrid, solveByLines } from "./line-solver";

const SIZE = 20;
const SEED = 20260924;
const TARGET = 10;
const MAX_CANDIDATES = 20000;
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

type Accepted = { solution: string; density: number; sweeps: number; firstPass: number; attempt: number; id: string };
const accepted: Accepted[] = [];
const seen = new Set<string>();
const started = performance.now();
let tried = 0;
for (; tried < MAX_CANDIDATES && accepted.length < 100; tried++) {
  const solution = candidate();
  if (seen.has(solution)) continue;
  seen.add(solution);
  const density = solution.split("1").length - 1;
  if (density < 180 || density > 260) continue;
  const { rows, columns } = cluesForGrid(solution, SIZE, SIZE);
  if (rows.some((runs) => runs.length === 0) || columns.some((runs) => runs.length === 0)) continue;
  const result = solveByLines(SIZE, SIZE, rows, columns);
  if (!result.solved || result.grid !== solution) continue;
  accepted.push({ solution, density: density / 400, sweeps: result.sweeps,
    firstPass: result.undeterminedAfterFirstPass, attempt: tried + 1,
    id: createHash("md5").update(solution).digest("hex").slice(0, 16) });
}
if (accepted.length < TARGET) throw new Error(`Only ${accepted.length} line-solvable candidates after ${tried} attempts`);

// Select across the difficulty range, while avoiding near-duplicates.
accepted.sort((a, b) => a.firstPass - b.firstPass || a.sweeps - b.sweeps || a.attempt - b.attempt);
const chosen: Accepted[] = [];
for (let slot = 0; slot < TARGET; slot++) {
  const target = Math.round((slot + 0.5) * accepted.length / TARGET);
  const ordered = accepted.map((item, index) => ({ item, distance: Math.abs(index - target) }))
    .sort((a, b) => a.distance - b.distance || a.item.attempt - b.item.attempt);
  const pick = ordered.find(({ item }) => !chosen.includes(item) &&
    chosen.every((other) => Array.from(item.solution).reduce((n, bit, index) => n + Number(bit !== other.solution[index]), 0) >= 60));
  if (!pick) throw new Error(`Could not select distinct candidate for slot ${slot}`);
  chosen.push(pick.item);
}

function formatPuzzle(item: Accepted): string {
  const { rows, columns } = cluesForGrid(item.solution, SIZE, SIZE);
  const rowLines = rows.map((runs, index) => `          Row ${index + 1}: ${runs.join(" ")}`).join("\n");
  const columnLines = columns.map((runs, index) => `          Column ${index + 1}: ${runs.join(" ")}`).join("\n");
  return `  // ${item.id}: ${(item.density * 100).toFixed(1)}% filled, ${item.sweeps} sweeps, ${item.firstPass} unresolved after first pass\n  {\n    clues: {\n      canonical: codeBlock\`\n        Row clues:\n${rowLines}\n        \n        Column clues:\n${columnLines}\n      \`,\n    },\n    height: 20,\n    width: 20,\n    solution: "${item.solution}",\n  },`;
}
const source = `import { codeBlock } from "common-tags";\nimport type { Puzzle } from "./types";\n\n// Generated by bun run generate-puzzles (seed ${SEED}).\nexport const PUZZLES_20X20: Puzzle[] = [\n${chosen.map(formatPuzzle).join("\n")}\n];\n`;
await mkdir(fileURLToPath(new URL("../visualizer/components/puzzles/", import.meta.url)), { recursive: true });
await writeFile(OUTPUT, source);
console.log(`Generated ${TARGET} puzzles from ${tried} candidates (${accepted.length} accepted) in ${((performance.now() - started) / 1000).toFixed(2)}s`);
for (const item of chosen) console.log(`${item.id} density=${(item.density * 100).toFixed(1)}% sweeps=${item.sweeps} firstPassUndetermined=${item.firstPass} candidate=${item.attempt}`);
