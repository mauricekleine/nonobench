import { codeBlock } from "common-tags";
import type { Puzzle } from "./types";

export const PUZZLES_5X5: Puzzle[] = [
  {
    clues: {
      canonical: codeBlock`
        Row clues:
          Row 1: 2 1
          Row 2: 5
          Row 3: 1 2
          Row 4: 2 1
          Row 5: 3
        
        Column clues:
          Column 1: 2
          Column 2: 4
          Column 3: 1 2
          Column 4: 3 1
          Column 5: 4
      `,
    },
    height: 5,
    width: 5,
    solution: "1101011111010110110100111",
  },
  {
    clues: {
      canonical: codeBlock`
        Row clues:
          Row 1: 1
          Row 2: 2
          Row 3: 4
          Row 4: 2 1
          Row 5: 2
        
        Column clues:
          Column 1: 2
          Column 2: 2
          Column 3: 1
          Column 4: 2 1
          Column 5: 2 2
      `,
    },
    height: 5,
    width: 5,
    solution: "0000100011111101100100011",
  },
  {
    clues: {
      canonical: codeBlock`
        Row clues:
          Row 1: 5
          Row 2: 1 3
          Row 3: 2 1
          Row 4: 2
          Row 5: 1
        
        Column clues:
          Column 1: 3
          Column 2: 1 2
          Column 3: 2 2
          Column 4: 3
          Column 5: 2
      `,
    },
    height: 5,
    width: 5,
    solution: "1111110111110100110000100",
  },
  {
    clues: {
      canonical: codeBlock`
        Row clues:
          Row 1: 1 1
          Row 2: 1 1
          Row 3: 1 3
          Row 4: 1 1
          Row 5: 2
        
        Column clues:
          Column 1: 1
          Column 2: 2 2
          Column 3: 1 1
          Column 4: 3
          Column 5: 1 1
      `,
    },
    height: 5,
    width: 5,
    solution: "0100101010101110101001100",
  },
  {
    clues: {
      canonical: codeBlock`
        Row clues:
          Row 1: 5
          Row 2: 1
          Row 3: 2 1
          Row 4: 1 1 1
          Row 5: 1
        
        Column clues:
          Column 1: 2 1
          Column 2: 1 1 1
          Column 3: 1 2
          Column 4: 1
          Column 5: 1 2
      `,
    },
    height: 5,
    width: 5,
    solution: "1111110000011011010101000",
  },
  {
    clues: {
      canonical: codeBlock`
        Row clues:
          Row 1: 2 1
          Row 2: 1 3
          Row 3: 2
          Row 4: 1
          Row 5: 3 1
        
        Column clues:
          Column 1: 1 1
          Column 2: 1 1
          Column 3: 2 2
          Column 4: 2
          Column 5: 3 1
      `,
    },
    height: 5,
    width: 5,
    solution: "0110110111000110010011101",
  },
  {
    clues: {
      canonical: codeBlock`
        Row clues:
          Row 1: 2 1
          Row 2: 2 1
          Row 3: 1 1
          Row 4: 5
          Row 5: 1
        
        Column clues:
          Column 1: 3
          Column 2: 2 1
          Column 3: 1 1
          Column 4: 3
          Column 5: 2 1
      `,
    },
    height: 5,
    width: 5,
    solution: "0110111001100101111100010",
  },
  {
    clues: {
      canonical: codeBlock`
        Row clues:
          Row 1: 2
          Row 2: 1 1
          Row 3: 1
          Row 4: 1 1
          Row 5: 3
        
        Column clues:
          Column 1: 2 1
          Column 2: 1
          Column 3: 2
          Column 4: 2
          Column 5: 1 1
      `,
    },
    height: 5,
    width: 5,
    solution: "0001110010100000010111100",
  },
  {
    clues: {
      canonical: codeBlock`
        Row clues:
          Row 1: 1 1
          Row 2: 1
          Row 3: 1
          Row 4: 3
          Row 5: 1
        
        Column clues:
          Column 1: 2
          Column 2: 1 1
          Column 3: 1
          Column 4: 1 1
          Column 5: 1
      `,
    },
    height: 5,
    width: 5,
    solution: "0101000001100001110000010",
  },
  {
    clues: {
      canonical: codeBlock`
        Row clues:
          Row 1: 3
          Row 2: 5
          Row 3: 1
          Row 4: 1 2
          Row 5: 2 1
        
        Column clues:
          Column 1: 1 1
          Column 2: 1 2
          Column 3: 3
          Column 4: 2 1
          Column 5: 2 2
      `,
    },
    height: 5,
    width: 5,
    solution: "0011111111001000101111001",
  },
];
