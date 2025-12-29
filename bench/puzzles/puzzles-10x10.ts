import { codeBlock } from "common-tags";
import type { Puzzle } from "./types";

export const PUZZLES_10X10: Puzzle[] = [
	{
		clues: {
			canonical: codeBlock`
        Row clues:
          Row 1: 2 1 1
          Row 2: 1 8
          Row 3: 5 1 1
          Row 4: 5 1 1
          Row 5: 5 1 1
          Row 6: 2 2 1 2
          Row 7: 1 2 3
          Row 8: 1 1
          Row 9: 3 1
          Row 10: 4 1
        
        Column clues:
          Column 1: 1 3 2
          Column 2: 4 2
          Column 3: 4 2
          Column 4: 7 1
          Column 5: 7
          Column 6: 3
          Column 7: 2 2 1
          Column 8: 4 3
          Column 9: 2 2
          Column 10: 5 1
      `,
		},
		height: 10,
		width: 10,
		solution: codeBlock`
		  0001101010
      1011111111
      0111110101
      0111110101
      1111100101
      1101101011
      1001101110
      0000000101
      1110000100
      1111001000
		`,
	},
	{
		clues: {
			canonical: codeBlock`
        Row clues:
          Row 1: 1 3
          Row 2: 7
          Row 3: 1 1
          Row 4: 1 5 2
          Row 5: 10
          Row 6: 1 1 6
          Row 7: 1 6
          Row 8: 3 1 1
          Row 9: 1 1 1 1
          Row 10: 4
        
        Column clues:
          Column 1: 2 6
          Column 2: 1 1 1
          Column 3: 1 6
          Column 4: 1 2 1 1
          Column 5: 10
          Column 6: 2 4 1
          Column 7: 10
          Column 8: 3
          Column 9: 3
          Column 10: 3
      `,
		},
		height: 10,
		width: 10,
		solution:
			"1000111000111111100000001010001011111011111111111110101111111011111100111010100010101010000001111000",
	},
	{
		clues: {
			canonical: codeBlock`
        Row clues:
          Row 1: 1 3 3
          Row 2: 1 3 1
          Row 3: 1 5 1
          Row 4: 1 2
          Row 5: 1 2 1 1
          Row 6: 2 1
          Row 7: 1 2 2
          Row 8: 1 2 2
          Row 9: 2 2
          Row 10: 1 3 1 1
        
        Column clues:
          Column 1: 2 2
          Column 2: 1 2 1 1
          Column 3: 1 1
          Column 4: 1 3 1 1
          Column 5: 1 1 2 3
          Column 6: 2 3
          Column 7: 5 1
          Column 8: 4 2 1
          Column 9: 1 1 2
          Column 10: 2 2
      `,
		},
		height: 10,
		width: 10,
		solution:
			"1011101110100001110101011111010001001100010110101011001000001011001100010011011000001100110101110101",
	},
	{
		clues: {
			canonical: codeBlock`
        Row clues:
          Row 1: 8
          Row 2: 4 1 1
          Row 3: 8
          Row 4: 6 2
          Row 5: 8
          Row 6: 3 2
          Row 7: 2 1 1
          Row 8: 2 4
          Row 9: 1 7
          Row 10: 1 1 3 1
        
        Column clues:
          Column 1: 1 1
          Column 2: 1 1 2
          Column 3: 6 1
          Column 4: 7 2
          Column 5: 5 3
          Column 6: 5 3
          Column 7: 1 1 1 4
          Column 8: 3 2 3
          Column 9: 1 5 1
          Column 10: 5 2
      `,
		},
		height: 10,
		width: 10,
		solution:
			"0011111111001111010100111111111111110011001111111101110001100001101010011011110001011111111001011101",
	},
	{
		clues: {
			canonical: codeBlock`
        Row clues:
          Row 1: 1 1
          Row 2: 6
          Row 3: 1 1
          Row 4: 1 2 1
          Row 5: 1 1
          Row 6: 8
          Row 7: 1 1 1
          Row 8: 1 1
          Row 9: 1 1 1
          Row 10: 1 3 3
        
        Column clues:
          Column 1: 2
          Column 2: 6
          Column 3: 1 1 1
          Column 4: 2 1 1
          Column 5: 1 1 2 1
          Column 6: 1 1 1 1
          Column 7: 2 1
          Column 8: 1 1 1
          Column 9: 6 1
          Column 10: 2
      `,
		},
		height: 10,
		width: 10,
		solution:
			"0001001000001111110001000000100100110010010000001001111111100100100010010000001010000100011011100111",
	},
];
