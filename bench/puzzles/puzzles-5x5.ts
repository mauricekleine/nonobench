import { codeBlock } from "common-tags";
import type { Puzzle } from "./types";

export const PUZZLES_5X5: Puzzle[] = [
	{
		clues: {
			canonical: codeBlock`
        Row clues:
          Row 1: 3 1
          Row 2: 1 2
          Row 3: 2 1
          Row 4: 3 1
          Row 5: 2 1
        
        Column clues:
          Column 1: 1 2
          Column 2: 5
          Column 3: 1 2
          Column 4: 2
          Column 5: 2 2
      `,
		},
		height: 5,
		width: 5,
		solution: "1110101011110101110101101",
	},
	{
		clues: {
			canonical: codeBlock`
        Row clues:
          Row 1: 2
          Row 2: 3
          Row 3: 1 2
          Row 4: 1 1
          Row 5: 2
        
        Column clues:
          Column 1: 2 1
          Column 2: 3 1
          Column 3: 1 2
          Column 4: 1
          Column 5: 1
      `,
		},
		height: 5,
		width: 5,
		solution: "1100011100010111010001100",
	},
	{
		clues: {
			canonical: codeBlock`
        Row clues:
          Row 1: 3 1
          Row 2: 2
          Row 3: 1 1
          Row 4: 2
          Row 5: 2 2
        
        Column clues:
          Column 1: 2 2
          Column 2: 5
          Column 3: 1
          Column 4: 1 1
          Column 5: 1 1
      `,
		},
		height: 5,
		width: 5,
		solution: "1110111000010101100011011",
	},
	{
		clues: {
			canonical: codeBlock`
        Row clues:
          Row 1: 1 1
          Row 2: 1 1
          Row 3: 1 1
          Row 4: 3
          Row 5: 2
        
        Column clues:
          Column 1: 1 1
          Column 2: 1
          Column 3: 4
          Column 4: 1
          Column 5: 1 2
      `,
		},
		height: 5,
		width: 5,
		solution: "0010110100001010011111000",
	},
	{
		clues: {
			canonical: codeBlock`
        Row clues:
          Row 1: 1 1
          Row 2: 2 1
          Row 3: 3
          Row 4: 3
          Row 5: 2
        
        Column clues:
          Column 1: 4
          Column 2: 5
          Column 3: 2
          Column 4: 1
          Column 5: 1
      `,
		},
		height: 5,
		width: 5,
		solution: "0100111010111001110011000",
	},
];
