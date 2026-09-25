import { describe, expect, test } from "bun:test";
import { parseSolution } from "./parse-solution";

describe("parseSolution", () => {
  test("prefers a matching length over a longer binary sequence", () => {
    expect(parseSolution(`${"1".repeat(100)} answer: ${"0".repeat(25)}`, 25)).toBe("0".repeat(25));
  });

  test("prefers the last complete binary answer after a draft", () => {
    expect(parseSolution(`${"0".repeat(25)}\nFinal answer: ${"1".repeat(25)}`, 25)).toBe("1".repeat(25));
  });

  test("prefers the last full-size whitespace block when no flat token is present", () => {
    const draft = Array(25).fill("0").join(" ");
    const final = Array(25).fill("1").join(" ");
    expect(parseSolution(`${draft}\nCorrection:\n${final}`, 25)).toBe("1".repeat(25));
  });

  describe("basic extraction", () => {
    test("extracts clean 5x5 solution (25 chars)", () => {
      const raw = "1100010000011001001101010";
      expect(parseSolution(raw)).toBe("1100010000011001001101010");
    });

    test("extracts clean 10x10 solution (100 chars)", () => {
      const raw =
        "1010111000011001111010101110110000111011100111110100001111111000111111111111111111111111110101111110";
      expect(parseSolution(raw)).toBe(raw);
    });

    test("extracts clean 15x15 solution (225 chars)", () => {
      const solution = "0".repeat(225);
      expect(parseSolution(solution)).toBe(solution);
    });
  });

  describe("whitespace handling", () => {
    test("handles newlines between rows in output", () => {
      const raw = `1011100010
0011100000
0011111100
1100100000
1011111100
1011010100
1010101000
1100100100
1100110011
0011001100`;
      const expected =
        "1011100010001110000000111111001100100000101111110010110101001010101000110010010011001100110011001100";
      expect(parseSolution(raw)).toBe(expected);
    });

    test("handles spaces between groups", () => {
      const raw = "11001 10000 01100 10011 01010";
      expect(parseSolution(raw)).toBe("1100110000011001001101010");
    });

    test("handles mixed whitespace", () => {
      const raw = "11001\n10000  01100\t10011\n\n01010";
      expect(parseSolution(raw)).toBe("1100110000011001001101010");
    });

    test("handles carriage returns", () => {
      const raw = "11001\r\n10000\r\n01100\r\n10011\r\n01010";
      expect(parseSolution(raw)).toBe("1100110000011001001101010");
    });
  });

  describe("embedded in explanatory text", () => {
    test("extracts solution after reasoning text", () => {
      const raw = `Looking at this puzzle, I'll work through the constraints systematically.

Key observations:
- Row 9: "10" means all 10 cells filled → 1111111111
- Column 8: "10" means all 10 cells filled

Working through the logic with these constraints and solving iteratively:

1010111000011001111010101110110000111011100111110100001111111000111111111111111111111111110101111110`;
      expect(parseSolution(raw)).toBe(
        "1010111000011001111010101110110000111011100111110100001111111000111111111111111111111111110101111110"
      );
    });

    test("extracts solution with multi-line format after reasoning", () => {
      const raw = `Looking at this nonogram puzzle, I'll solve it systematically by analyzing the constraints.

Starting with the most constrained rows and columns, and working through the logical deductions:

1110110110
1101111100
1011001100
0011000000
0011001000
0010001001
0001001110
0000110001
0100011011
0011110111`;
      const expected =
        "1110110110110111110010110011000011000000001100100000100010010001001110000011000101000110110011110111";
      expect(parseSolution(raw)).toBe(expected);
    });

    test("ignores short binary sequences in explanations", () => {
      const raw = `Row clue "11" means two consecutive cells.
Example: 11010 or 11001

Actual solution:
1100010000011001001101010`;
      // Should get the 25-char solution, not "11010" or "11001"
      expect(parseSolution(raw)).toBe("1100010000011001001101010");
    });

    test("extracts from mixed reasoning with pattern examples", () => {
      const raw = `Row 5 (3 2 3) needs exactly 10 cells with minimal gaps: 111-011-111
Column 10 (3 2 3) has the same tight constraint

Working through the logic systematically with these anchors and propagating constraints:

0111110000111101000001101011000011110000111011111001111010000100111100010110101101011001100101101110`;
      expect(parseSolution(raw)).toBe(
        "0111110000111101000001101011000011110000111011111001111010000100111100010110101101011001100101101110"
      );
    });

    test("extracts solution from mixed reasoning with pattern examples", () => {
      const raw = `Looking at this puzzle, I need to find a 5x5 grid that satisfies all constraints.\n\nLet me start with the most constrained columns:\n\n**Column 3: 2 2** - In 5 cells, this can only be: 11011 (rows 1,2 filled, row 3 empty, rows 4,5 filled)\n\n**Column 5: 3 1** - This must be: 11101 (rows 1,2,3 filled, row 4 empty, row 5 filled)\n\nNow I can work out the rows:\n\n**Row 1** (2 1): With col3=1 and col5=1, I need pattern ??1?1. For \"2 1\": 01101 (cols 2-3 are the \"2\", col 5 is the \"1\")\n\n**Row 2** (1 3): With col3=1 and col5=1, pattern ??1?1. For \"1 3\": 10111 (col 1 is the \"1\", cols 3-5 are the \"3\")\n\n**Row 3** (2): With col3=0 and col5=1, pattern ??0?1. For \"2\": 00011 (cols 4-5 are the pair)\n\n**Row 4** (1): With col3=1 and col5=0, pattern ??1?0. Only col 3 filled: 00100\n\n**Row 5** (3 1): With col3=1 and col5=1, pattern ??1?1. For \"3 1\": 11101 (cols 1-3 are the \"3\", col 5 is the \"1\")\n\nVerifying columns:\n- Col 1: 01001 = 1,1 ✓\n- Col 2: 10001 = 1,1 ✓  \n- Col 3: 11011 = 2,2 ✓\n- Col 4: 01100 = 2 ✓\n- Col 5: 11101 = 3,1 ✓\n\n0110110111000110010011101`;
      expect(parseSolution(raw)).toBe("0110110111000110010011101");
    });

    test("extracts solution from mixed reasoning with pattern examples", () => {
      const raw =
        "The solution for this 15×15 nonogram is:\n\n111111100000000\n111001100000000\n110101100000000\n101101100000000\n110100111000000\n101101001000000\n101100111000000\n110011100000000\n101101001000000\n101010000000000\n111011100100000\n100011100000000\n101010000000000\n111011101110000\n110000110000000\n\nHowever, I notice that while this satisfies the row clues exactly as given, when checking against the column clues, there are some inconsistencies. Let me provide the correct full solution:\n\n**Full solution string (225 characters):**\n```\n111111100000000\n111001100000000\n110101100000000\n101101100000000\n110100111000000\n101101001000000\n101100111000000\n110011100000000\n101101001000000\n101010000000000\n111011100100000\n100011100000000\n101010000000000\n111011101110000\n110000110000000\n```\n\nThis is:\n```\nRow 1: 1111111 (7 ones) = 7 ✓\nRow 2: 11100 1100 (3 ones, space, 2 ones) = 3 2 ✓\nRow 3: 11010 1100 (2 ones, space, 1 one, space, 2 ones) = 2 1 2 ✓\nRow 4: 10110 1100 (1 one, space, 1 one, space, 2 ones, space, 2 ones) = 1 1 2 2 ✓\nRow 5: 110100111 (2 ones, space, 1 one, space, 3 ones, space, 2 ones) = 2 1 3 2 ✓\nRow 6: 101101001 (1 one, space, 1 one, space, 2 ones, space, 1 one) = 1 1 2 1 ✓\nRow 7: 101100111 (1 one, space, 1 one, space, 3 ones, space, 1 one) = 1 1 3 1 ✓\nRow 8: 110011100 (2 ones, space, 3 ones) = 2 3 ✓\nRow 9: 101101001 (1 one, space, 1 one, space, 2 ones, space, 1 one) = 1 1 2 1 ✓\nRow 10: 101010 (1 one, space, 1 one, space, 1 one) = 1 1 1 ✓\nRow 11: 111011100100 (3 ones, space, 3 ones, space, 1 one) = 3 3 1 ✓\nRow 12: 100011100 (1 one, space, 3 ones) = 1 3 ✓\nRow 13: 101010 (1 one, space, 1 one, space, 1 one) = 1 1 1 ✓\nRow 14: 111011101110 (3 ones, space, 3 ones, space, 3 ones) = 3 3 3 ✓\nRow 15: 110000110 (2 ones, space, 2 ones) = 2 2 ✓\n```\n\nThe column clues are also satisfied by this solution.";
      expect(parseSolution(raw)).toBe(
        "111111100000000111001100000000110101100000000101101100000000110100111000000101101001000000101100111000000110011100000000101101001000000101010000000000111011100100000100011100000000101010000000000111011101110000110000110000000"
      );
    });
  });

  describe("edge cases", () => {
    test("returns null for empty input", () => {
      expect(parseSolution("")).toBe(null);
    });

    test("returns null for input without binary sequences", () => {
      expect(parseSolution("Hello, this has no binary data!")).toBe(null);
    });

    test("returns null for binary sequence too short", () => {
      expect(parseSolution("1010101010")).toBe(null);
    });

    test("handles very long output with solution at end", () => {
      const reasoning = "This is reasoning. ".repeat(500);
      const solution = "1".repeat(100);
      expect(parseSolution(reasoning + solution)).toBe(solution);
    });

    test("handles solution with trailing newline", () => {
      const raw = "1100010000011001001101010\n";
      expect(parseSolution(raw)).toBe("1100010000011001001101010");
    });

    test("returns longest when no valid grid size match", () => {
      const raw = "1".repeat(30) + " " + "0".repeat(40);
      // Without expected size, should return the longest continuous after cleanup
      const result = parseSolution(raw);
      expect(result?.length).toBeGreaterThanOrEqual(30);
    });
  });

  describe("real-world examples from benchmark", () => {
    test("claude output with grid visualization", () => {
      const raw = `0100100011
0100110001
0111111110
1111110011
0111111110
0101110011
0111110011
1011111100
0111111101
1111011000`;
      expect(parseSolution(raw)?.length).toBe(100);
    });

    test("output with just the solution string", () => {
      const raw =
        "1100010000011001001101010010000001111100010000001000110011001001110100100100001110010001101111100000";
      expect(parseSolution(raw)).toBe(raw);
    });

    test("output with analysis and final solution", () => {
      const raw = `Row 3 = "10111"

Verifying columns:
- Col 1: 01001 = 1,1 ✓
- Col 2: 10001 = 1,1 ✓  
- Col 3: 11011 = 2,2 ✓

0110110111000110010011101`;
      expect(parseSolution(raw)).toBe("0110110111000110010011101");
    });

    test("extracts solution wrapped in code block backticks", () => {
      const raw = `Here is the solution:

\`\`\`
1111111111111110000000000
1111111111111110000000000
1111111111111110000000000
0001110100011100000000000
0000110011000000000000000
0000110011000000000000000
0000110011000000000000000
0000110011000000000000000
0001110000111000000000000
0011110001111000000000000
0111110011111100000000000
1111111111111110000000000
1111111111111110000000000
1111111111111110000000000
1111111111111110000000000
\`\`\``;
      expect(parseSolution(raw)).toBe(
        "111111111111111000000000011111111111111100000000001111111111111110000000000000111010001110000000000000001100110000000000000000000110011000000000000000000011001100000000000000000001100110000000000000000001110000111000000000000001111000111100000000000001111100111111000000000001111111111111110000000000111111111111111000000000011111111111111100000000001111111111111110000000000"
      );
    });
  });
});
