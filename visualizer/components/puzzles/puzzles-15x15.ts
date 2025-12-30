import { codeBlock } from "common-tags";
import type { Puzzle } from "./types";

export const PUZZLES_15X15: Puzzle[] = [
  {
    clues: {
      canonical: codeBlock`
        Row clues:
          Row 1: 5
          Row 2: 13 1
          Row 3: 1 11
          Row 4: 14
          Row 5: 7 2
          Row 6: 8
          Row 7: 7
          Row 8: 2 6
          Row 9: 2 2
          Row 10: 2 4 2
          Row 11: 7 5
          Row 12: 15
          Row 13: 14
          Row 14: 14
          Row 15: 11 1
        
        Column clues:
          Column 1: 5 5
          Column 2: 2 11
          Column 3: 2 4 5
          Column 4: 2 12
          Column 5: 15
          Column 6: 8 6
          Column 7: 7 6
          Column 8: 3 3 4
          Column 9: 3 1 5
          Column 10: 3 6
          Column 11: 3 6
          Column 12: 3 5
          Column 13: 4 5
          Column 14: 3 3
          Column 15: 2 4
      `,
    },
    height: 15,
    width: 15,
    solution: "011111000000000111111111111101100011111111111111111111111110111111100000110111111110000000011111110000000110111111000000110110000000000110111100110000111111101111100111111111111111011111111111111011111111111111001111111111101",
  },
  {
    clues: {
      canonical: codeBlock`
        Row clues:
          Row 1: 1 1
          Row 2: 4 1
          Row 3: 4 4 1
          Row 4: 1 1 4
          Row 5: 5
          Row 6: 3 3
          Row 7: 1 8
          Row 8: 6 1 1
          Row 9: 1 2 2 3
          Row 10: 1 4 3
          Row 11: 7 3
          Row 12: 7 2
          Row 13: 1 2 1 1
          Row 14: 1 1 3 1 3
          Row 15: 1 7 1
        
        Column clues:
          Column 1: 1 1
          Column 2: 3 1
          Column 3: 2 2
          Column 4: 2 6
          Column 5: 3 2 2 1
          Column 6: 5 2
          Column 7: 1 9
          Column 8: 1 3 6
          Column 9: 3 7 1
          Column 10: 7 2
          Column 11: 2 1 1
          Column 12: 11
          Column 13: 3 4 1
          Column 14: 1 7 2
          Column 15: 1 1
      `,
    },
    height: 15,
    width: 15,
    solution: "100000000000001011110001000000011110111100010010010001111000000000000111110000000011101110000010111111110000011111101010000101101101110000101111001110001111111001110001111111001100000100110001010010101110101110100011111110001",
  },
  {
    clues: {
      canonical: codeBlock`
        Row clues:
          Row 1: 1 1
          Row 2: 6 2
          Row 3: 1 1 3 1
          Row 4: 1 2 1 1 1
          Row 5: 1 2 1 1
          Row 6: 1 1 2 1
          Row 7: 2 1 1 1
          Row 8: 1 1 1 2 1
          Row 9: 1 1 2 2
          Row 10: 3 1 1 1
          Row 11: 3 3 1 1
          Row 12: 1 1 1 1 1
          Row 13: 3 1 1 1
          Row 14: 1 1 1 1 2 1
          Row 15: 2 1 1 2
        
        Column clues:
          Column 1: 2 2
          Column 2: 5 1 1 1
          Column 3: 1 1 1
          Column 4: 1 1 1 1 4
          Column 5: 1 1 1 1 1 1
          Column 6: 1 1 1 4
          Column 7: 6 1 1 1
          Column 8: 1 1 1
          Column 9: 3 1 1 1 2
          Column 10: 1 1 3
          Column 11: 1 1 1 1
          Column 12: 1 1
          Column 13: 1 4
          Column 14: 8 1
          Column 15: 4 2
      `,
    },
    height: 15,
    width: 15,
    solution: "000000100100000011111100000110010000101110010010110101000010010001101000010010010110000010001101001000010010010100011010100100011000011111000100000101000111001110101000101000100101000111010100100100101001011001110000101000011",
  },
  {
    clues: {
      canonical: codeBlock`
        Row clues:
          Row 1: 1
          Row 2: 7
          Row 3: 4 4
          Row 4: 4 2
          Row 5: 2 1 2 2
          Row 6: 2 7 2
          Row 7: 2 4 1 2
          Row 8: 2 1 4 2
          Row 9: 2 1 4 2
          Row 10: 2 1 4 2
          Row 11: 2 1 2 2
          Row 12: 2 4
          Row 13: 4 4
          Row 14: 7
          Row 15: 1
        
        Column clues:
          Column 1: 1
          Column 2: 7
          Column 3: 4 4
          Column 4: 2 2
          Column 5: 3 1 2
          Column 6: 10 2
          Column 7: 2 2 2
          Column 8: 2 5 2
          Column 9: 2 7 2
          Column 10: 2 2 7
          Column 11: 2 5 3
          Column 12: 2 2
          Column 13: 4 4
          Column 14: 7
          Column 15: 1
      `,
    },
    height: 15,
    width: 15,
    solution: "000000010000000000011111110000000111101111000001111000001100011001001100110011011111110110011001111010110110001011110011011001011110110011001011110110011001001100110001100000111100000111101111000000011111110000000000010000000",
  },
  {
    clues: {
      canonical: codeBlock`
        Row clues:
          Row 1: 7
          Row 2: 3 2
          Row 3: 2 1 2
          Row 4: 1 1 2 2
          Row 5: 2 1 3 2
          Row 6: 1 1 2 1
          Row 7: 1 1 3 1
          Row 8: 2 3
          Row 9: 1 1 2 1
          Row 10: 1 1 1
          Row 11: 3 3 1
          Row 12: 1 3
          Row 13: 1 1 1
          Row 14: 3 3 3
          Row 15: 2 2
        
        Column clues:
          Column 1: 2
          Column 2: 3 1
          Column 3: 2 3 1
          Column 4: 1 4 1 1
          Column 5: 2 1 1 2
          Column 6: 1 2 2 1 1
          Column 7: 1 1 2 1
          Column 8: 1 1 1 1 1 1
          Column 9: 1 2 1 1 2 1
          Column 10: 1 2 1 2 1
          Column 11: 2 1 1 1 2
          Column 12: 2 1 1 2 1
          Column 13: 2 1 2
          Column 14: 2 1
          Column 15: 2
      `,
    },
    height: 15,
    width: 15,
    solution: "000011111110000001110000011000011001000001100010001001100110110100011100011100100000011001010100111000010000110000111000001001011000100001001000001000001110111001000000000101110000000001000100100001110111011100000011000110000",
  },
  {
    clues: {
      canonical: codeBlock`
        Row clues:
          Row 1: 8 6
          Row 2: 8 5
          Row 3: 7 5
          Row 4: 7 4
          Row 5: 8 3
          Row 6: 4 1 3
          Row 7: 3 3
          Row 8: 4 2 2
          Row 9: 2 3 2
          Row 10: 2 3 2
          Row 11: 3 2
          Row 12: 3 3
          Row 13: 4 3
          Row 14: 5 3
          Row 15: 6 5
        
        Column clues:
          Column 1: 15
          Column 2: 15
          Column 3: 8 5
          Column 4: 6 1 3
          Column 5: 5 2
          Column 6: 5 3 1
          Column 7: 5 3
          Column 8: 2 1 2
          Column 9: 1
          Column 10: 1
          Column 11: 3 1
          Column 12: 4 1
          Column 13: 7 4
          Column 14: 15
          Column 15: 15
      `,
    },
    height: 15,
    width: 15,
    solution: "111111110111111111111110011111111111100011111111111100001111111111110000111111100001000111111000000000111111101100000011110001110000011110001110000011111000000000011111000000000111111100000000111111110000000111111111000011111",
  },
  {
    clues: {
      canonical: codeBlock`
        Row clues:
          Row 1: 10
          Row 2: 11
          Row 3: 12
          Row 4: 13
          Row 5: 1 1
          Row 6: 1
          Row 7: 1
          Row 8: 1 2
          Row 9: 13
          Row 10: 12
          Row 11: 3 2
          Row 12: 2 2 2
          Row 13: 3 7
          Row 14: 9
          Row 15: 4
        
        Column clues:
          Column 1: 1
          Column 2: 5 3
          Column 3: 4 7
          Column 4: 4 7
          Column 5: 4 3 3
          Column 6: 4 2 2
          Column 7: 4 2 1
          Column 8: 4 2 1
          Column 9: 4 2 2
          Column 10: 4 2 2
          Column 11: 4 2 3
          Column 12: 3 3 2
          Column 13: 2 3 1
          Column 14: 2 5
          Column 15: 3
      `,
    },
    height: 15,
    width: 15,
    solution: "011111111110000011111111111000011111111111100011111111111110010000000000010100000000000000010000000000000010000000001100011111111111110001111111111110001110000000011001100000011011001110001111111001111111110000001111000000000",
  },
  {
    clues: {
      canonical: codeBlock`
        Row clues:
          Row 1: 15
          Row 2: 15
          Row 3: 15
          Row 4: 3 1 3
          Row 5: 2 2
          Row 6: 2 2
          Row 7: 2 2
          Row 8: 2 2
          Row 9: 3 3
          Row 10: 4 4
          Row 11: 5 5
          Row 12: 7 7
          Row 13: 15
          Row 14: 15
          Row 15: 15
        
        Column clues:
          Column 1: 15
          Column 2: 15
          Column 3: 4 7
          Column 4: 3 6
          Column 5: 3 5
          Column 6: 3 4
          Column 7: 3 4
          Column 8: 4 3
          Column 9: 3 4
          Column 10: 3 4
          Column 11: 3 5
          Column 12: 3 6
          Column 13: 4 7
          Column 14: 15
          Column 15: 15
      `,
    },
    height: 15,
    width: 15,
    solution: "111111111111111111111111111111111111111111111111000010000111110000000000011110000000000011110000000000011110000000000011111000000000111111100000001111111110000011111111111101111111111111111111111111111111111111111111111111111",
  },
  {
    clues: {
      canonical: codeBlock`
        Row clues:
          Row 1: 13
          Row 2: 3 3
          Row 3: 3 3
          Row 4: 3 4
          Row 5: 3 3
          Row 6: 3 3
          Row 7: 3 3
          Row 8: 13
          Row 9: 13
          Row 10: 14
          Row 11: 14
          Row 12: 15
          Row 13: 15
          Row 14: 15
          Row 15: 8
        
        Column clues:
          Column 1: 3
          Column 2: 5
          Column 3: 14
          Column 4: 14
          Column 5: 14
          Column 6: 1 7
          Column 7: 1 7
          Column 8: 1 8
          Column 9: 1 8
          Column 10: 1 8
          Column 11: 1 8
          Column 12: 1 1 8
          Column 13: 15
          Column 14: 15
          Column 15: 15
      `,
    },
    height: 15,
    width: 15,
    solution: "001111111111111001110000000111001110000000111001110000001111001110000000111001110000000111001110000000111001111111111111001111111111111011111111111111011111111111111111111111111111111111111111111111111111111111000000011111111",
  },
  {
    clues: {
      canonical: codeBlock`
        Row clues:
          Row 1: 3 3
          Row 2: 1 1 2
          Row 3: 7
          Row 4: 3 3
          Row 5: 2 1
          Row 6: 2 2
          Row 7: 2 2
          Row 8: 1
          Row 9: 2 2
          Row 10: 2 2
          Row 11: 2 2
          Row 12: 2 1
          Row 13: 2 2
          Row 14: 2 1 1 1 3
          Row 15: 1 1 1 1 2
        
        Column clues:
          Column 1: 1 1 1 1
          Column 2: 1 2 2 1
          Column 3: 1 2 2 1
          Column 4: 1 2 2 1
          Column 5: 1 3
          Column 6: 2 1 1
          Column 7: 1 1
          Column 8: 1
          Column 9: 2 3
          Column 10: 1 1 3
          Column 11: 1 1 2 1
          Column 12: 1 1 2 1
          Column 13: 1 3 1
          Column 14: 1 4 1
          Column 15: 1 1 1 1
      `,
    },
    height: 15,
    width: 15,
    solution: "011100000111000100000001000011000001111111000000111000000111001100000000010011000000000011110000000000110000000000000100110000000001100011000000011000001100000110000000110000100000000011001100000011010101000111100101001011000",
  },
];
