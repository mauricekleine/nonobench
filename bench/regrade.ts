import { PUZZLES } from "../visualizer/components/puzzles";
import { getPuzzleId, openReadDb } from "./db";
import { parseSolution } from "./parse-solution";

const db = openReadDb();
if (!db) throw new Error("Database does not exist");
const puzzles = new Map(PUZZLES.map((puzzle) => [getPuzzleId(puzzle), puzzle]));
type Row = { model: string; puzzle_id: string; raw_output: string | null; correct: number };
const rows = db.query<Row, []>("SELECT model, puzzle_id, raw_output, correct FROM runs ORDER BY model, puzzle_id").all();
db.close();
let disagreements = 0;
let unknown = 0;
for (const row of rows) {
  const puzzle = puzzles.get(row.puzzle_id);
  if (!puzzle) {
    console.log(`Unknown puzzle: ${row.model} ${row.puzzle_id}`);
    unknown++;
    continue;
  }
  const parsed = parseSolution(row.raw_output ?? "", puzzle.width * puzzle.height);
  const correct = parsed === puzzle.solution.replace(/\s+/g, "");
  if (correct !== (row.correct === 1)) {
    console.log(`Disagreement: ${row.model} ${row.puzzle_id} stored=${row.correct} parsed=${correct}`);
    disagreements++;
  }
}
console.log(`Regraded ${rows.length} rows: ${disagreements} disagreements, ${unknown} unknown puzzles.`);
if (disagreements || unknown) process.exitCode = 1;
