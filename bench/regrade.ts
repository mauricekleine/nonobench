import { PUZZLES } from "../visualizer/components/puzzles";
import { getPuzzleId, openReadDb } from "./db";
import { gradeOutput } from "./grade";

// Read-only: compares stored `correct` with the current grader. Upgrades are
// valid alternative solutions that exact-match grading rejected; a downgrade
// would mean the grader regressed.
const db = openReadDb();
if (!db) throw new Error("Database does not exist");
const puzzles = new Map(PUZZLES.map((puzzle) => [getPuzzleId(puzzle), puzzle]));
type Row = { model: string; puzzle_id: string; raw_output: string | null; correct: number; status: string };
const rows = db.query<Row, []>("SELECT model, puzzle_id, raw_output, correct, status FROM runs ORDER BY model, puzzle_id").all();
db.close();
let upgrades = 0;
let downgrades = 0;
let unknown = 0;
for (const row of rows) {
  const puzzle = puzzles.get(row.puzzle_id);
  if (!puzzle) {
    console.log(`Unknown puzzle: ${row.model} ${row.puzzle_id}`);
    unknown++;
    continue;
  }
  const correct = row.status === "success" && gradeOutput(puzzle, row.raw_output);
  if (correct === (row.correct === 1)) continue;
  console.log(`${correct ? "Upgrade" : "Downgrade"}: ${row.model} ${row.puzzle_id}`);
  if (correct) upgrades++;
  else downgrades++;
}
console.log(`Regraded ${rows.length} rows: ${upgrades} upgrades, ${downgrades} downgrades, ${unknown} unknown puzzles.`);
if (downgrades || unknown) process.exitCode = 1;
