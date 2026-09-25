# Nonobench: method learnings

The moments that changed how Nonobench measures models. This is not a
changelog. Each entry records what we assumed, what the data showed, what we
changed, and what remains open. Together they are the caveats and design
decisions a write-up of the benchmark would need to flag and explain.

Numbers refer to the Standard set (30 core puzzles: ten each of 5x5, 10x10
and 15x15) unless noted. Hard mode is the 20x20 tier.

---

## 1. Correct answers are not unique: grade against the clues

**Assumed.** Each puzzle has one solution, so an answer is correct when it
matches the stored grid.

**Saw.** Ten of the 30 core puzzles admit more than one grid that satisfies
every row and column clue. Exact matching marked valid answers as wrong. A
forensic pass over every stored answer also found valid grids that the parser
missed when a model restated its grid several times while reasoning.

**Changed (V1.2).** An answer is correct when it satisfies every clue. When a
text answer contains several grids, the last complete grid counts. A regrade
of all historical runs moved 43 answers from wrong to right and none the
other way.

**Open.** Puzzles with several solutions are slightly easier, since more
grids count as correct. A uniqueness-checked puzzle set removes this; Hard
mode is uniqueness-checked with an exact solver.

## 2. "The same model" is not the same model on every endpoint

**Assumed.** A model ID on OpenRouter is one model.

**Saw.** Six open-weight families had been served by third-party resellers
running fp4/fp8 quantizations, not by their own lab. Even first-party
endpoints differ: Moonshot serves Kimi at mxfp4.

**Changed (V1.2).** Every model is pinned to its lab's first-party endpoint
with fallbacks disabled. Provider and quantization are recorded for every
run, and results from the earlier endpoints were rerun.

**Open.** Results measure a model *as served*, including the lab's own
quantization and serving choices. Reproducing a result needs the provider,
not just the model name.

## 3. Output mode is not neutral

**Assumed.** Structured output (a JSON schema) only removes parsing noise.

**Saw.** For some models, forcing the schema changed behaviour. On a 5x5
comparison, Qwen 3.8 Max, Qwen 3.8 Flash, Mistral Medium 3.5 and Claude
Fable 5.1 did clearly better in plain text. Kimi K3 on its first-party
endpoint went from 0/10 with the schema to 10/10 in text, with similar
reasoning length, so the schema itself broke it. Some first-party endpoints
(DeepSeek, GLM) do not support structured output at all.

**Changed.** Structured output is the default. A model moves to text mode
when its lab's endpoint lacks it, or when a 5x5 comparison shows a clear
gap. A 0/10 result on 5x5 stops a run automatically as a likely format
problem rather than recording it as a score.

**Open.** Choosing the output mode per model on benchmark puzzles is a form
of tuning. It is done on 5x5, the easiest tier, and disclosed, but it is a
researcher degree of freedom.

## 4. The answer format itself stops scaling: counting fails before logic

**Assumed.** A flat string of width x height `0`/`1` characters works at any
size, because it works at 5x5.

**Saw.** The share of answers with the wrong number of cells grows with grid
size. For the same seven strong models: 12/70 answers at 10x10 (100 cells),
31/70 at 15x15 (225), 45/70 at 20x20 (400). On the first Hard-mode run,
81 of about 100 answers had the wrong length. GPT-6 Sol and Claude Fable 5.1
got the length wrong on all ten puzzles; only Gemini 3.8 Flash and GPT-6
Astra mostly got it right. Some models also reasoned far less on 20x20 than
on 15x15 (Claude Opus 5.5 about 1–2k reasoning tokens vs 8.5k), which
suggests sketching the picture rather than solving it.

**Why (literature).** This is the failure the tokenization literature
predicts. Long runs of a repeated character are split into irregular
multi-character tokens, and counting them breaks down within tens of
characters. Separators between items improve counting by 13–40 points
([Counting Ability of LLMs and Impact of Tokenization](https://arxiv.org/html/2410.19730v2)).
Models can also hold the right count internally and still emit the wrong
one ([Repeated-Token Counting](https://arxiv.org/html/2605.09239v1)).
Common grid formats are row by row:
- ARC-AGI stores every grid as a list of rows.
- The webpbn nonogram format stores one string per row.
- Rosetta Code's nonogram solver prints one row per line.

We found no published nonogram benchmark that compares a flat string with
rows directly. VGRP-Bench, which includes nonograms, reports format failures
as a major problem even with 2D JSON arrays
([VGRP-Bench](https://arxiv.org/html/2503.23064v2)).

**Changed.** Hard mode was paused after about $14 of runs. Candidate fix:
ask for the grid row by row, as an array of row strings or one row per line,
so each row resets the count. Being tested before rerunning.

**Open.** A wrong-length answer can be a counting failure or a model that is
lost on the logic; the answer alone doesn't say which. Standard also carries
this effect (31/70 at 15x15). It applies equally to every version, so
comparisons stay fair, but scores partly measure output bookkeeping. Changing
the format for Standard would break comparability with all earlier runs.

## 5. Bigger is not harder: difficulty needs its own measure

**Assumed.** 20x20 is harder than 15x15.

**Saw.** Gemini 3.8 Flash solved 8/10 of the first 20x20s but 5/10 of the
15x15s. The generated 20x20s are picture-like, with long filled runs, and
the easier ones fall to row-by-row logic. Two of the 15x15s need more than
line logic.

**Changed.** Hard mode mixes five line-solvable 20x20s with five unique
puzzles that line logic alone can't solve, checked by an exact solver.
Difficulty is described by line-solvability and how far line propagation
gets, not by size.

**Open.** A principled difficulty scale (search depth, branching needed) would
make tiers comparable.

## 6. Provider limits become scores unless handled explicitly

**Saw.** Meta ends Muse Spark requests at 5 minutes, confirmed from the
provider's own activity data. Long reasoning on large grids hits that limit.

**Changed.** A request that dies at a documented provider limit is recorded
as a `timeout`: final and unsolved, never retried. A timeout needs evidence:
a connection-drop or timeout error near the documented cutoff. Anything else
is a retryable failure. Variants with timeouts are labelled "incomplete".
Retries are only ever for API errors, never for wrong answers.

**Open.** Timeouts penalise slow-but-careful reasoning on that provider. The
score measures the model *under its provider's limits*.

## 7. Guards must be per model, not per answer

**Saw.** An early guard re-ran individual answers that came back with zero
reasoning tokens. That is cherry-picking: it retries until the answer looks
like reasoning happened.

**Changed.** A zero-reasoning check trips per model (a circuit breaker) and
stops that model; it never re-rolls single answers.

## 8. "Best level" flatters families with more levels

**Saw.** Effort ladders are noisy and not monotonic: Claude Opus 5.5 scored
28/30 at high but 25 at xhigh and 26 at max; GPT-6 Sol 26 at high and 25 at
max. Picking each family's best of several noisy single-run measurements
favours families with more levels (winner's curse).

**Changed.** The leaderboard says "best observed level", shows every level on
the effort ladder, and lists this under Limitations.

**Open.** Fairer options: pick the level on a held-out set, or report a fixed
level per family (e.g. the provider's default).

## 9. The Standard set saturates at the top

**Saw.** GPT-6 Astra xhigh solved 30/30; Astra high 29 and Opus 5.5 high 28.
With one attempt per puzzle, the 95% ranges of the top models overlap
almost entirely.

**Implication.** Standard no longer separates the frontier. That is the
reason for Hard mode, and why its answer format (section 4) has to be right.

## 10. The prompt is part of the method: version it

**Saw.** The prompt gained the line "if there is no solution, output 0"
partway through the original January session; 747 early runs used the
earlier wording.

**Changed.** Every variant carries a version (1.0 January, 1.1 February–March,
1.2 September). An immutable attempt log records every API attempt with the
code revision, provider, output mode and raw output.

---

## Measurement notes

- **Single attempt per puzzle.** n = 30 per Standard score; the Wilson 95%
  range is about ±15 points in the middle of the scale. Repeats would
  tighten it at proportional cost.
- **Cost and time are as served.** Both are measured through OpenRouter and
  include provider speed and pricing, not just the model.
