# A lab new to Nonobench

Read this when the model's maker prefix (the part of the OpenRouter id before `/`) isn't in `firstPartyProviders` in `bench/constants.ts`. The model is added the same way. The lab needs these entries first; export fails with `Unmapped OpenRouter provider` until they exist.

1. **`bench/constants.ts` → `firstPartyProviders`**: map the maker prefix to the lab's OpenRouter provider slug. Use the `tag` of the lab's own endpoint from `/api/v1/models/<id>/endpoints`, without any `/variant` suffix. If the lab has no endpoint of its own, stop and ask Maurice. Every result on the site measures a model as its lab serves it (LEARNINGS §2).
2. **`bench/export.ts` → `knownProviders`**: add the maker prefix.
3. **`visualizer/lib/providers.ts` → `PROVIDERS`**: add `{ name, color }`. Colors are spread around the hue wheel and keep a minimum OKLab distance of about 10 from every other provider, with 3:1 contrast on the dark panels. Pick a hue that fills the widest gap, and check it with the `dataviz` skill's validator against the existing 14. Maurice likes per-provider colors: keep them, only keep pairs distinct.
4. **Logo**: add the lab's mark to `providerLogoPaths` in `visualizer/components/provider-logos/provider-logo.tsx`, keyed by the maker prefix. The existing paths come from `@lobehub/icons-static-svg` (MIT). Take the lab's icon from there when it has one, and credit it in the folder's `LICENSE.md`. `ProviderLogoSprite` picks up the new key automatically.
5. **Launch video palette**: add the same color to `PROVIDER_COLORS` in `video/src/brand/theme.ts`, which keeps its own copy of the provider colors.

Check the lab's logo on the leaderboard, in a filter chip and in the puzzle explorer before shipping. Mention the new provider in the PR.
