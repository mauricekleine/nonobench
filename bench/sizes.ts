export function sortSizes(sizes: string[]): string[] {
  return [...sizes].sort((a, b) => {
    const aNum = Number.parseInt(a.split("x")[0] ?? "0", 10);
    const bNum = Number.parseInt(b.split("x")[0] ?? "0", 10);
    return aNum - bNum;
  });
}
export const CORE_SIZES = ["5x5", "10x10", "15x15"] as const;
export const EXTENDED_SIZES = ["20x20"] as const;

// How the model writes its grid. Standard (core) keeps the original flat
// string so every version stays comparable. Hard mode asks for one row per
// line: at 400 cells, most models miscount a flat string (see LEARNINGS.md).
// NONOBENCH_ANSWER_FORMAT overrides it for format experiments, which must
// write to a separate database (NONOBENCH_DB).
export type AnswerFormat = "flat" | "rows";
export function answerFormatFor(size: string): AnswerFormat {
  const override = process.env.NONOBENCH_ANSWER_FORMAT;
  if (override === "flat" || override === "rows") return override;
  return (EXTENDED_SIZES as readonly string[]).includes(size) ? "rows" : "flat";
}

// Hard mode answer budget. Without it each provider's default applies
// (65,536 for some, 131,072 for others), which cuts off long reasoning
// unevenly. Every Hard-mode request gets the same budget, capped at the
// endpoint's own maximum (max-output-tokens.json).
export const HARD_MODE_OUTPUT_TOKENS = 128_000;
