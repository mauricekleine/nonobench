import { codeBlock } from "common-tags";
import type { Puzzle } from "./types";

export const PUZZLES_15X15: Puzzle[] = [
	{
		clues: {
			canonical: codeBlock`
        Row clues:
          Row 1: 15
          Row 2: 15
          Row 3: 9 1 3
          Row 4: 7 2 1
          Row 5: 5 4 2
          Row 6: 7
          Row 7: 2 1 2
          Row 8: 2 1 2 2
          Row 9: 1 2 2
          Row 10: 1 2
          Row 11: 3 3
          Row 12: 4 1 4
          Row 13: 7 6
          Row 14: 15
          Row 15: 15
        
        Column clues:
          Column 1: 15
          Column 2: 8 5
          Column 3: 6 5
          Column 4: 6 1 4
          Column 5: 6 2 3
          Column 6: 4 1 4
          Column 7: 6 3
          Column 8: 3 1 1 2
          Column 9: 3 1 1 2
          Column 10: 2 2 3
          Column 11: 4 3
          Column 12: 2 1 4
          Column 13: 3 5
          Column 14: 3 1 9
          Column 15: 5 9
      `,
		},
		height: 15,
		width: 15,
		solution:
			"111111111111111111111111111111111111111010111111111100110001111110111100011111111100000000110000000001011110010011000011100110000000011100000000000011111000000000111111101000001111111111100111111111111111111111111111111111111",
	},
	{
		clues: {
			canonical: codeBlock`
        Row clues:
          Row 1: 11 3
          Row 2: 10 2
          Row 3: 3 4 2
          Row 4: 1
          Row 5: 1 1
          Row 6: 1
          Row 7: 1 1
          Row 8: 1 2
          Row 9: 1 2
          Row 10: 2 3
          Row 11: 2 3
          Row 12: 1 1 4
          Row 13: 1 1 5
          Row 14: 2 7
          Row 15: 13
        
        Column clues:
          Column 1: 5 7
          Column 2: 3 2
          Column 3: 3 1 1
          Column 4: 2 1 1
          Column 5: 2 2
          Column 6: 3 2
          Column 7: 3 1
          Column 8: 3 1
          Column 9: 3 2
          Column 10: 2 2
          Column 11: 1 3
          Column 12: 4
          Column 13: 1 6
          Column 14: 3 8
          Column 15: 3 11
      `,
		},
		height: 15,
		width: 15,
		solution:
			"111111111110111111111111100011111001111000011100000000000000100000000000001000000000000001100000000000001100000000000011100000000000011110000000000111110000000000111101000000001111100100000011111000011001111111001111111111111",
	},
	{
		clues: {
			canonical: codeBlock`
        Row clues:
          Row 1: 2 2
          Row 2: 2 1 1
          Row 3: 2 1 2
          Row 4: 1 1 3 1
          Row 5: 4 1 1 1 1
          Row 6: 1 1 1 1
          Row 7: 1 3 1
          Row 8: 2 1 3 1 1
          Row 9: 1 1 1
          Row 10: 1 2 2 1
          Row 11: 1 1 1 1
          Row 12: 1 1 1 1
          Row 13: 1 2 2
          Row 14: 1 1 2 3
          Row 15: 2 2
        
        Column clues:
          Column 1: 1 1
          Column 2: 2 2
          Column 3: 2 1 2 3
          Column 4: 1 3 1 3 1
          Column 5: 1 1
          Column 6: 1 2 1 1
          Column 7: 1 1 1 5
          Column 8: 1 2 1 1
          Column 9: 2 1 1
          Column 10: 3 1 1
          Column 11: 1 3 1
          Column 12: 3 3 1
          Column 13: 1 1
          Column 14: 3 1
          Column 15: 7
      `,
		},
		height: 15,
		width: 15,
		solution:
			"001100110000000011001001000000110000101100000000100010111010111100010101010010100000001010001001110000001001101001110101000010000010001000101100011001000100100001001000100100001001001001100000011001010110011100001100001100000",
	},
	{
		clues: {
			canonical: codeBlock`
        Row clues:
          Row 1: 15
          Row 2: 12 2
          Row 3: 11 2
          Row 4: 11 1
          Row 5: 1 1 3
          Row 6: 1 2
          Row 7: 2
          Row 8: 1 2
          Row 9: 1 3
          Row 10: 2 3
          Row 11: 3 4
          Row 12: 4 6
          Row 13: 1 2 7
          Row 14: 1 12
          Row 15: 15
        
        Column clues:
          Column 1: 6 8
          Column 2: 4 3 1
          Column 3: 4 2 1
          Column 4: 4 4
          Column 5: 4 3
          Column 6: 4 2
          Column 7: 5 2
          Column 8: 4 2
          Column 9: 4 3
          Column 10: 4 4
          Column 11: 4 4
          Column 12: 2 5
          Column 13: 1 1 7
          Column 14: 3 11
          Column 15: 15
      `,
		},
		height: 15,
		width: 15,
		solution:
			"111111111111111111111111111011111111111110011111111111110001100000100000111100000000000011000000000000011100000000000011100000000000111110000000000111111000000001111111100000111111100110001111111100111111111111111111111111111",
	},
	{
		clues: {
			canonical: codeBlock`
        Row clues:
          Row 1: 5 2
          Row 2: 10
          Row 3: 9
          Row 4: 14
          Row 5: 14
          Row 6: 15
          Row 7: 4 3 1 3
          Row 8: 2
          Row 9: 2 5
          Row 10: 9
          Row 11: 1 4 2
          Row 12: 6 2
          Row 13: 1 4 2
          Row 14: 6 2
          Row 15: 2 1 3
        
        Column clues:
          Column 1: 2
          Column 2: 2 4
          Column 3: 7
          Column 4: 7
          Column 5: 6
          Column 6: 7 6
          Column 7: 6 2 1 2
          Column 8: 6 6
          Column 9: 5 5
          Column 10: 7 7
          Column 11: 6 6
          Column 12: 3 3 1
          Column 13: 12
          Column 14: 4 7
          Column 15: 4
      `,
		},
		height: 15,
		width: 15,
		solution:
			"011111000110000011111111110000001111111110000011111111111111011111111111111111111111111111111101110100111000000000001100000000110111110000001111111110000001011110110000001111110110000001011110110000001111110110000001100101110",
	},
];
