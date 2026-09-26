# Grader forensics, 2026-09-25

The source database was opened only through `openReadDb()` (`readonly: true`). This audit examined every one of the 1,424 stored-wrong successful runs and checked candidate grids with `satisfiesClues`, including the ten puzzles with multiple valid solutions. It also checked all 964 stored-correct successful runs for downgrades. There are 12 timeout runs, excluded from answer grading.

## Historical scores versus extraction

Before this change, `bun run regrade` already reported **38 upgrades, 0 downgrades**. These records contain clue-valid answers that the *current* grader already accepts, mostly simple, exact-length binary strings. They are stale stored scores, not newly recovered by this patch. The new rule finds **five additional** clue-valid final answers. After the change, regrade reports **43 upgrades, 0 downgrades, 0 unknown puzzles** across 2,400 runs. The lead should re-export results; this branch does not change the database or generated results JSON.

Counts below are incremental to the grader as it stood before this patch, except the two explicitly marked overlapping searches. A downgrade means applying the candidate as the selected answer would invalidate a run already accepted by that grader.

| Mechanical interpretation | New correct / downgrades | Decision |
| --- | ---: | --- |
| Last exact-length, uninterrupted 0/1 token | **5 / 0** | **Adopt.** Each is an explicit final grid after draft rows, row calculations, or a prior grid. The current whitespace parser can accidentally join the final token to a preceding row. |
| Last exact-length whitespace 0/1 block | 1 / 0 (overlaps above) | **Adopt as fallback.** When there is no complete token, the final full-size block is the natural answer. |
| Complete binary rows, including labels, spaces, pipes, commas, Markdown table cells or code fences | 2 / 0 (both overlap above) | No additional parser: both runs give the same grid again as a final flat token. Parsing intermediate rows could override a later answer. |
| `#`/`.`, `X`/`_`, `■`/`□` row grids; JSON arrays of binary row strings | 0 / 0 | No change without a real recovered answer. |
| Transpose a candidate grid as column-major output | 0 / 1,002 | Reject. Nothing in the output establishes column-major order. Blind transposition would invalidate all 1,002 runs accepted by the pre-change grader. |
| Drop a leading or trailing digit from an oversized binary token | 2 / 0 (both trailing) | Reject. Both are otherwise bare, explicitly 26- or 101-digit answers. Choosing which digit is stray guesses at model intent. |
| Try every full-size window inside a longer binary token | 12 / 0 (includes the two above) | Reject. Ten other matches are mostly shifts through long, repetitive strings on the same 15×15 puzzle. This searches for a valid grid rather than reading an answer. |

Examples of the five recovered final answers:

| Model, puzzle ID | What the output actually says |
| --- | --- |
| `deepseek-v3.2`, `6f84bfd3f1a7cbc9` | Starts with a wrong five-row draft, explicitly retracts it, then ends `**Answer:** 1111110111110100110000100`. |
| `claude-4.5-sonnet-reasoning`, `10c94beeac75e691` | Derives rows in prose, then ends `0110111001100101111100010`. |
| `claude-4.5-sonnet-reasoning`, `285ce3e57757f96b` | Derives rows in prose, then ends `0101010000100000111000001`. |
| `claude-4.5-opus-high`, `015afc53630076a9` | `Row 10: 1000000110` is followed by a blank line and a valid 100-digit final token. The old whitespace parser merges them into 110 digits. |
| `claude-fable-5.1-low`, `60d381bdbdb0391b` | A five-row grid is followed by the same valid 25-digit flat token. The old parser merges both into 50 digits. |

## Model impact from the adopted rule

| Model | Newly correct |
| --- | ---: |
| `claude-4.5-opus-high` | 1 |
| `claude-4.5-sonnet-reasoning` | 2 |
| `claude-fable-5.1-low` | 1 |
| `deepseek-v3.2` | 1 |

## Other format checks for launch

- Among strict JSON runs, **zero** `solution` strings have exactly the expected length yet contain characters other than `0` and `1`. Of 780 successful strict JSON runs, 731 have a string `solution`, 46 have empty raw output, two have malformed JSON, and one has a bare 225-digit string instead of an object. No JSON row arrays appeared.
- **175** successful runs have empty raw output: 115 legacy, 46 strict JSON, and 14 text mode. Nineteen report 131,072 output tokens, consistent with exhausting an output budget before producing a final answer; 27 report zero output tokens. These are real no-answer records, not extraction misses, but the `success` status deserves a separate harness review.
- `ministral-14b-2512` has **22 wrong-size answers in 30 wrong runs**. In 15 of its 20 larger puzzles, it produced exactly 205 digits, mostly zeros, regardless of whether 100 or 225 cells were requested. This looks like a model or endpoint format failure rather than a subtle grader miss. Other models with high wrong-size shares (for example `grok-4.1-fast-reasoning-high`, 23/26 wrong runs) show varied lengths, consistent with incorrect model outputs rather than one systematic extraction format.

The extraction change is in `parse-solution.ts`, used by live grading, both exports, and regrade through `grade.ts`. Real-run regression cases are in `grade.test.ts`. Verification: `bun test` (79 pass), `bun run typecheck` (pass), `bun run regrade` (43 upgrades, 0 downgrades).
