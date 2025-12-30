import { codeBlock } from "common-tags";
import type { Puzzle } from "./types";

export const PUZZLES_10X10: Puzzle[] = [
  {
    clues: {
      canonical: codeBlock`
        Row clues:
          Row 1: 1 5
          Row 2: 4 1
          Row 3: 2 1 2
          Row 4: 2 3
          Row 5: 3 2 3
          Row 6: 4 1
          Row 7: 1 4
          Row 8: 1 1 2 1
          Row 9: 1 2 2
          Row 10: 1 2 3
        
        Column clues:
          Column 1: 3 1
          Column 2: 4 1 1
          Column 3: 2 1 1
          Column 4: 1 1
          Column 5: 1 5 1
          Column 6: 1 5 1
          Column 7: 1 1 4
          Column 8: 1 4 1
          Column 9: 1 1 1 2
          Column 10: 3 2 3
      `,
    },
    height: 10,
    width: 10,
    solution: "0010011111011110000111000100111100111000111011011100001111010100111100100010110100100110110101100111",
  },
  {
    clues: {
      canonical: codeBlock`
        Row clues:
          Row 1: 3 2 2
          Row 2: 2 5
          Row 3: 1 2 2
          Row 4: 3
          Row 5: 2 1
          Row 6: 1 1 1
          Row 7: 1 1 1
          Row 8: 2 1
          Row 9: 1 2 2
          Row 10: 4 1 2
        
        Column clues:
          Column 1: 2 1
          Column 2: 2 1
          Column 3: 1 2 2 2
          Column 4: 1 2 1
          Column 5: 4 3
          Column 6: 3 1 2
          Column 7: 2 1 1
          Column 8: 1 1 1
          Column 9: 1 1 1 2
          Column 10: 1 1 1 1
      `,
    },
    height: 10,
    width: 10,
    solution: "1110011011110111110000101100110011100000000110100000100100101010000100000011000100101101100111101011",
  },
  {
    clues: {
      canonical: codeBlock`
        Row clues:
          Row 1: 1 3 1
          Row 2: 1 3
          Row 3: 7
          Row 4: 2 1
          Row 5: 1 5 2
          Row 6: 1 2 1 1
          Row 7: 1 1 1 1
          Row 8: 2 1 1
          Row 9: 2 2 2
          Row 10: 1 2 2 2
        
        Column clues:
          Column 1: 1 2 1
          Column 2: 1 2
          Column 3: 1 8
          Column 4: 4 1
          Column 5: 1 1 1 3
          Column 6: 3 1 2
          Column 7: 5 1 1
          Column 8: 2 1 2
          Column 9: 1 1 1 2
          Column 10: 2 1
      `,
    },
    height: 10,
    width: 10,
    solution: "0010111010100001110001111111000011001000101111101110110001010010101010011010010001101101101011011011",
  },
  {
    clues: {
      canonical: codeBlock`
        Row clues:
          Row 1: 1 1
          Row 2: 4 2 1
          Row 3: 6 1
          Row 4: 1 5 1
          Row 5: 1 2
          Row 6: 1 4 1
          Row 7: 4 3 1
          Row 8: 7
          Row 9: 3 2
          Row 10: 2 2 3
        
        Column clues:
          Column 1: 1 3 2 1
          Column 2: 2 5
          Column 3: 2 1 3
          Column 4: 9
          Column 5: 3 1 1 1
          Column 6: 2 3
          Column 7: 1 1 3 1
          Column 8: 2 1 1 2
          Column 9: 2
          Column 10: 3 2
      `,
    },
    height: 10,
    width: 10,
    solution: "1000000100011110110111111100011001111101101100000001011110011111011101111111100001110001101101101110",
  },
  {
    clues: {
      canonical: codeBlock`
        Row clues:
          Row 1: 4 2
          Row 2: 1 3
          Row 3: 3 4
          Row 4: 4 2
          Row 5: 1 1
          Row 6: 4 2 1
          Row 7: 2 3
          Row 8: 4 1
          Row 9: 1 1 1 1
          Row 10: 5 1
        
        Column clues:
          Column 1: 1 1 2
          Column 2: 1 2 2 2
          Column 3: 4 1 1
          Column 4: 1 7
          Column 5: 1 2 1
          Column 6: 3 1
          Column 7: 2 1 2
          Column 8: 4 1
          Column 9: 3 1
          Column 10: 2 1 2
      `,
    },
    height: 10,
    width: 10,
    solution: "1111000110001000011111100011110111101100000100001011110110011101110000000111100101010010010111110100",
  },
  {
    clues: {
      canonical: codeBlock`
        Row clues:
          Row 1: 3
          Row 2: 6
          Row 3: 3 2
          Row 4: 2 3
          Row 5: 1 2 2
          Row 6: 9
          Row 7: 7
          Row 8: 1 6
          Row 9: 1 3
          Row 10: 10
        
        Column clues:
          Column 1: 1 1 1
          Column 2: 1 2
          Column 3: 1 1
          Column 4: 3 1
          Column 5: 7 1
          Column 6: 7 1
          Column 7: 2 5
          Column 8: 2 7
          Column 9: 10
          Column 10: 4 2 1
      `,
    },
    height: 10,
    width: 10,
    solution: "0000000111000011111100001110110000110111100011011001111111110001111111100111111001000011101111111111",
  },
  {
    clues: {
      canonical: codeBlock`
        Row clues:
          Row 1: 1 1 1
          Row 2: 1 1 1
          Row 3: 1 6
          Row 4: 4 1
          Row 5: 7
          Row 6: 6 1
          Row 7: 9
          Row 8: 5 1 1
          Row 9: 5 3
          Row 10: 1 2
        
        Column clues:
          Column 1: 6
          Column 2: 9
          Column 3: 6
          Column 4: 1 7
          Column 5: 8
          Column 6: 1 3
          Column 7: 3 3
          Column 8: 1 1 2
          Column 9: 2 2 2
          Column 10: 1 1
      `,
    },
    height: 10,
    width: 10,
    solution: "0101000001010010001001011111100111101000111111100011111100101111111110111110100111111011101000000110",
  },
  {
    clues: {
      canonical: codeBlock`
        Row clues:
          Row 1: 1 3
          Row 2: 2 1 3
          Row 3: 1 3 2 1
          Row 4: 3 3
          Row 5: 5 1
          Row 6: 7
          Row 7: 7
          Row 8: 9
          Row 9: 10
          Row 10: 1 6
        
        Column clues:
          Column 1: 1 2
          Column 2: 2 2
          Column 3: 2 2
          Column 4: 7
          Column 5: 8
          Column 6: 1 7
          Column 7: 1 1 6
          Column 8: 10
          Column 9: 2 1 5
          Column 10: 9
      `,
    },
    height: 10,
    width: 10,
    solution: "0100001110011001011110111011010001110111000111110100011111110001111111011111111111111111111000111111",
  },
  {
    clues: {
      canonical: codeBlock`
        Row clues:
          Row 1: 2 1
          Row 2: 2 1 2
          Row 3: 1 1 1
          Row 4: 1 4 2
          Row 5: 1 1
          Row 6: 2 2
          Row 7: 1 3 1
          Row 8: 1 1 1
          Row 9: 2 1 1 2
          Row 10: 5
        
        Column clues:
          Column 1: 1
          Column 2: 1 1 4
          Column 3: 2 2 1
          Column 4: 3 1
          Column 5: 1 4
          Column 6: 2 1 1 1
          Column 7: 2 4
          Column 8: 1
          Column 9: 1 3 1
          Column 10: 1 1 2 1
      `,
    },
    height: 10,
    width: 10,
    solution: "0110010000001101001110010010000101111011001000001001100000110100111001010010100001101010110001111100",
  },
  {
    clues: {
      canonical: codeBlock`
        Row clues:
          Row 1: 2 1
          Row 2: 6 1
          Row 3: 9
          Row 4: 6 3
          Row 5: 6 3
          Row 6: 1 7
          Row 7: 2 2 1
          Row 8: 7 1
          Row 9: 1 1 1
          Row 10: 2 2
        
        Column clues:
          Column 1: 2
          Column 2: 6
          Column 3: 5 2
          Column 4: 6 2
          Column 5: 7 1
          Column 6: 7 1
          Column 7: 2 1 1
          Column 8: 9
          Column 9: 1 4 1
          Column 10: 5 2
      `,
    },
    height: 10,
    width: 10,
    solution: "0011000010001111110101111111111111110111111111011101011111110110110100011111110100010001010000110110",
  },
];
