// Deterministic line propagation. A cell is settled only when every placement
// consistent with the current grid gives it the same value.
export function runsForLine(line: string): number[] {
  return (line.match(/1+/g) ?? []).map((run) => run.length);
}

export function cluesForGrid(solution: string, width: number, height: number) {
  const rows = Array.from({ length: height }, (_, row) =>
    runsForLine(solution.slice(row * width, (row + 1) * width)));
  const columns = Array.from({ length: width }, (_, col) =>
    runsForLine(Array.from({ length: height }, (_, row) => solution[row * width + col]).join("")));
  return { rows, columns };
}

const placementCache = new Map<string, number[]>();

function placements(length: number, runs: number[]): number[] {
  const key = `${length}:${runs.join(",")}`;
  const cached = placementCache.get(key);
  if (cached) return cached;
  const result: number[] = [];
  function place(index: number, start: number, mask: number): void {
    if (index === runs.length) {
      result.push(mask);
      return;
    }
    const run = runs[index]!;
    const remaining = runs.slice(index + 1).reduce((sum, value) => sum + value, 0)
      + runs.length - index - 1;
    for (let at = start; at + run + remaining <= length; at++) {
      place(index + 1, at + run + 1, mask | (((1 << run) - 1) << at));
    }
  }
  place(0, 0, 0);
  placementCache.set(key, result);
  return result;
}

export type LineSolveResult = {
  solved: boolean;
  grid: string;
  sweeps: number;
  undeterminedAfterFirstPass: number;
};

export function solveByLines(width: number, height: number, rows: number[][], columns: number[][]): LineSolveResult {
  const cells = new Int8Array(width * height).fill(-1);
  let sweeps = 0;
  let undeterminedAfterFirstPass = width * height;
  for (;;) {
    sweeps++;
    let changed = false;
    for (const axis of ["row", "column"] as const) {
      const count = axis === "row" ? height : width;
      const length = axis === "row" ? width : height;
      for (let line = 0; line < count; line++) {
        const clues = axis === "row" ? rows[line]! : columns[line]!;
        let knownFilled = 0;
        let knownEmpty = 0;
        for (let at = 0; at < length; at++) {
          const value = cells[axis === "row" ? line * width + at : at * width + line];
          if (value === 1) knownFilled |= 1 << at;
          if (value === 0) knownEmpty |= 1 << at;
        }
        let union = 0;
        let intersection = (1 << length) - 1;
        let valid = 0;
        for (const mask of placements(length, clues)) {
          if ((mask & knownFilled) !== knownFilled || (mask & knownEmpty) !== 0) continue;
          union |= mask;
          intersection &= mask;
          valid++;
        }
        if (valid === 0) return { solved: false, grid: "", sweeps, undeterminedAfterFirstPass };
        for (let at = 0; at < length; at++) {
          const index = axis === "row" ? line * width + at : at * width + line;
          if (cells[index] !== -1) continue;
          const bit = 1 << at;
          if (intersection & bit) { cells[index] = 1; changed = true; }
          else if (!(union & bit)) { cells[index] = 0; changed = true; }
        }
      }
    }
    if (sweeps === 1) undeterminedAfterFirstPass = cells.filter((cell) => cell === -1).length;
    if (!changed) break;
  }
  return {
    solved: cells.every((cell) => cell !== -1),
    grid: Array.from(cells, (cell) => cell === -1 ? "?" : String(cell)).join(""),
    sweeps,
    undeterminedAfterFirstPass,
  };
}
