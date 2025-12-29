export { PUZZLES_5X5 } from "./puzzles-5x5";
export { PUZZLES_10X10 } from "./puzzles-10x10";
export { PUZZLES_15X15 } from "./puzzles-15x15";
export type { Puzzle } from "./types";

import { PUZZLES_5X5 } from "./puzzles-5x5";
import { PUZZLES_10X10 } from "./puzzles-10x10";
import { PUZZLES_15X15 } from "./puzzles-15x15";

export const PUZZLES = [...PUZZLES_5X5, ...PUZZLES_10X10, ...PUZZLES_15X15];
