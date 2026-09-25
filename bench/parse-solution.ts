/**
 * Extracts a binary solution string from raw LLM output.
 *
 * Handles:
 * - Solutions with whitespace/newlines between digits
 * - Solutions embedded in explanatory text
 * - Multi-line formatted output
 *
 * @param rawOutput - The raw text output from the LLM
 * @param expectedLength - Optional expected number of cells (25, 100, or 225)
 * @returns The extracted binary string, or null if no valid solution found
 */
export function parseSolution(rawOutput: string, expectedLength?: number): string | null {
  if (!rawOutput) return null;

  // A complete binary token is the clearest statement of a flattened grid.
  // Prefer the last one: models often show drafts or row-by-row work before
  // giving a final answer. This also keeps a labelled final row from merging
  // with the answer on the next line into one oversized whitespace block.
  if (expectedLength !== undefined) {
    const exactTokens = (rawOutput.match(/[01]{25,}/g) ?? []).filter((match) => match.length === expectedLength);
    if (exactTokens.length) return exactTokens.at(-1)!;
  }

  // Strategy 1: Find sequences of 0s and 1s with optional whitespace between them
  // This regex captures binary digits with any whitespace interspersed
  const binaryWithWhitespaceRegex = /(?:[01][\s]*){25,}/g;
  const matches = rawOutput.match(binaryWithWhitespaceRegex);

  if (matches) {
    // Clean whitespace from each match and find the best one
    const cleanedMatches = matches.map((m) => m.replace(/\s/g, ""));

    const exactMatch = cleanedMatches.findLast((match) => match.length === expectedLength);
    if (exactMatch) return exactMatch;
    const longestMatch = cleanedMatches.reduce(
      (a, b) => (a.length >= b.length ? a : b),
      ""
    );
    if (longestMatch.length >= 25) return longestMatch;
  }

  // Strategy 2: Clean all whitespace first, then find continuous binary sequences
  const cleaned = rawOutput.replace(/\s/g, "");
  const continuousMatches = cleaned.match(/[01]{25,}/g);

  if (continuousMatches) {
    const exactMatch = continuousMatches.find((match) => match.length === expectedLength);
    if (exactMatch) return exactMatch;
    return continuousMatches.reduce(
      (a, b) => (a.length >= b.length ? a : b),
      ""
    );
  }

  return null;
}
