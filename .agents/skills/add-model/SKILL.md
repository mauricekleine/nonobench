---
name: add-model
description: Add a new LLM to Nonobench and benchmark it, from OpenRouter lookup through config, a paid run, export and a data PR. Use when a model just dropped or a reader asks to see a model on the leaderboard ("add GPT-6.1 Sol", "run Qwen3.9 on Nonobench"), or for Hard mode (20x20) runs of a new model.
---

# Add a model to Nonobench

A new model is a **new variant** per effort level (`<family>-<effort>`, e.g. `gpt-6.1-sol-high`). The runner derives the ladder from `bench/effort-levels.json`; you configure one representative variant and the evidence files, run the paid benchmark, export and open one data PR.

Two rules frame everything:

- **History is frozen.** Only new variants run. Existing rows in `bench/results.db` never change and old models never rerun, so the leaderboard stays comparable. Any diff that touches another model's entries is out of scope: revert it and mention it to Maurice.
- **Runs cost real money.** Get Maurice's approval on a plan with a cost estimate before the first paid call. Read docs and OpenRouter's catalog before spending credits on diagnostic calls.

Work in a linked worktree on a `data/<family>` branch. Run bench commands from `bench/`, site commands from `visualizer/`.

## 1. Look up the model

Every fact here comes from free, unauthenticated sources:

- Catalog entry: `curl -s https://openrouter.ai/api/v1/models | jq '.data[] | select(.id=="<id>")'`. It gives `created` (for `addedAt`), `pricing` (USD per token), `context_length` and `reasoning.supported_efforts`.
- Endpoints: `curl -s https://openrouter.ai/api/v1/models/<id>/endpoints | jq '.data.endpoints[] | {provider_name, tag, quantization, supported_parameters}'`. Confirm the lab's own endpoint exists and whether it lists `structured_outputs`.
- The lab's own docs for its native reasoning levels. OpenRouter maps an unsupported level to the nearest supported one without saying so (LEARNINGS §14), so a five-level list may hide three native levels.

Labs often release siblings on the same day (`-pro`, `-mini`, a `:batch` route). Benchmark the plain id and list the siblings in the plan so Maurice can choose; `:batch` ids are a cheaper route to the same model, never a separate entry.

**Done when** you know: the OpenRouter id, the family name (`gpt-6.1-sol`), the display name (`GPT-6.1 Sol`), open weights or not, the native effort levels, the first-party provider slug, and whether that endpoint supports structured outputs.

If the maker prefix (`openai`, `qwen`, …) isn't in `firstPartyProviders` in `bench/constants.ts`, the lab is new to Nonobench: read [references/new-provider.md](references/new-provider.md) before step 3.

## 2. Plan and get approval

Choose the variants:

- **Full ladder** (every native level) is the default for a reader request or a new frontier model. It answers "does more effort help?" in one go.
- **Step-up ladder** for pricier or less promising models: start at the lowest level and add the next while it gains 2+ puzzles. The `constants.ts` comments record past steps.
- **No effort control** (reasoning on/off only): one `default` variant.
- **Hard mode (20x20)** only for a family whose best Standard score is near the top (about 27/30 or better), or when Maurice asks. Hard mode answers cost several times a Standard answer. It runs with a 128,000-token output budget, capped at the endpoint's limit from `bench/max-output-tokens.json`: add the model there with the pinned endpoint's `max_completion_tokens`, since a missing entry assumes 128,000 and an endpoint with a lower limit rejects the request.

Estimate cost from a comparable family already on the site: `visualizer/app/results.json` has `totalCost` per size for every variant. Scale by the price ratio from the catalog, per level. State the estimate per variant and in total, and propose a `--max-cost` cap about 1.5× the total.

**Done when** Maurice has approved the variant list and the cap.

## 3. Configure

1. **`bench/constants.ts`**: add one entry to the September batch, before the `defaultReasoningModel` block, with a comment saying why it's there (reader request, new release). The representative is the lowest level: `reasoningModel("<id>", "<family>", "low")`. Use `defaultReasoningModel("<id>", "<family>")` when there's no effort control. Add `outputMode: "text"` when the first-party endpoint lacks structured outputs.
2. **`bench/refresh-effort-levels.ts`**: add the id to `modelIds`. If the id carries a date or dash-version suffix (`-0902`, `-3-5`), add a `.replace` so the family name matches the one in `constants.ts`.
3. **Refresh the evidence files**: `bun run refresh-effort-levels`, `bun run refresh-provider-pins`, `bun run refresh-metadata`. Each rewrites the whole file, so other models' entries drift with the live catalog. Keep only the new model's entry in each file, e.g. for provider pins:
   ```bash
   python3 - <<'EOF'
   import json, subprocess
   f, key = "provider-pins.json", "<id>"
   old = json.loads(subprocess.check_output(["git", "show", f"HEAD:bench/{f}"]))
   new = json.load(open(f))
   old["models"][key] = new["models"][key]
   old["models"] = dict(sorted(old["models"].items()))
   open(f, "w").write(json.dumps(old, indent=2) + "\n")
   EOF
   ```
   Same idea for `effort-levels.json` (`families[<family>]`, plus `fetchedAt`) and `model-metadata.json` (top-level `<id>`).
4. **Native levels only**: when the lab documents fewer levels than OpenRouter lists, add the model to `nativeLevels` in `refresh-effort-levels.ts` with a link to the lab's docs, and rerun the refresh. A trim made by hand in `effort-levels.json` disappears at the next refresh.
5. **Names and metadata**: add `"<family>": "<Display Name>"` to `bench/family-display-names.json`. Check `model-metadata.json` has the right `displayName`, `openWeights` and `addedAt` (the catalog's `created`). The refresh marks a model open-weight when the catalog lists a `hugging_face_id`; when it doesn't but the weights are public, add the model to `model-metadata-overrides.json` with its Hugging Face `sourceUrl`.
6. **Check the plan**: `bun run bench` with no flags prints the plan for every model and makes no calls. The new variants appear with all puzzles missing, pinned to the lab's slug, in the output mode you intended, and without `endpoint unavailable`. Compare against the plan on `main`: no other model's line changes.
7. `bun test` and `bun run typecheck` in `bench/`.

**Done when** the plan lists exactly the approved variants and the tests pass.

## 4. Run

```bash
OPENROUTER_API_KEY=$(op read "op://Private/NONOBENCH_OPENROUTER_API_KEY/password" --account kaulos.1password.eu) \
  bun run bench --model <family>-low --model <family>-medium ... --max-cost <cap> > <scratchpad>/<family>.log 2>&1
```

- Run it in the background and wait for it to exit; a full ladder takes 30 minutes to a few hours. Add `--sizes 20x20` for Hard mode.
- The runner has two guards:
  - It stops a variant that scores 0/10 on 5x5, since that's likely a format problem. Compare formats on a scratch DB (`NONOBENCH_DB=<scratch>.db NONOBENCH_OUTPUT_MODE=text`, 5x5 only) before switching the model to text mode, and tell Maurice. A switch to text mode is disclosed method tuning (LEARNINGS §3).
  - It stops a variant whose runs report zero reasoning tokens, which usually means the endpoint ignores the effort setting. Check the endpoint docs before retrying.
- Failed runs (provider errors, timeouts) stay retryable: rerun the same command and only missing or retryable puzzles run again.

Then check that each effort level really is a different setting: average reasoning tokens should rise from level to level. Two neighbouring levels with the same token profile most likely map to one native level (LEARNINGS §14); flag it in the PR.

**Done when** every approved variant has all its puzzles recorded, or Maurice has accepted the gaps.

## 5. Export and verify

1. `bun run export` in `bench/`. It rewrites `visualizer/app/results.json`, `visualizer/public/puzzle-results.json` and `visualizer/public/results-raw.json`.
2. Run `bun test` in both `bench/` and `visualizer/`, then `bun run build` in `visualizer/`. The export-contract test checks the committed exports match the DB.
3. Check each new entry in `results.json`:
   - `version` is `1.2`;
   - `displayName`, `familyDisplayName`, `openWeights` and `addedAt` are right;
   - the scores match the run log.
4. Look at the leaderboard and the puzzle explorer for the new family in the dev server, using the `agent-browser` skill.

## 6. Ship

1. `git fetch`, and merge `origin/main` if it moved. Other sessions ship in parallel, and `results.db` is binary, so rerun the export after the merge rather than resolving it by hand.
2. Commit the config, `bench/results.db` and the three exports on the branch. Use the commit subject `data: <Display Name>, <what ran> (<why>)`.
3. Open the PR with:
   - why the model was added;
   - the variants that ran;
   - scores per size, next to the nearest comparable models;
   - the actual cost against the estimate;
   - any level trims or output-mode choices.
4. Merging to `main` deploys through Dokploy. Once deployed, confirm the model shows up on https://www.nonobench.com/api/v1/leaderboard.

**Done when** the model is live on nonobench.com and Maurice has the results summary.
