# Agent Instructions

- To inspect or verify a running UI, use the global `agent-browser` skill (the pinned `agent-browser` CLI); use Chrome DevTools MCP only for performance traces.

## Formatting and linting

This repo trials Bun's formatter and linter ahead of a release. The pre-commit hook (husky, set up by `bun install` at the root) runs `bun-canary fmt --staged && bun-canary lint --staged`; dotfiles installs `bun-canary`. `[fmt]` and `[lint]` in the root `bunfig.toml` set the style and the ignored paths; video and visualizer keep their `.oxlintrc.json`, which `bun-canary lint` reads. Run `bun-canary fmt` or `bun-canary lint` at the root for the whole repo. Builds and installs stay on the pinned `bun`. Retire `bun-canary` for `bun fmt` and `bun lint` once a Bun release ships them.

## Dependencies

Upgrades follow the `mk-dependency-upgrades` skill; holds live in `taze.config.ts`. `bench`, `video` and `visualizer` are separate Bun projects with no root workspace (the root `package.json` only pins taze and husky); `data` is a uv project.

- Checks: root `bun-canary fmt --check && bun-canary lint`; bench `bun run typecheck && bun test`; video `bun run lint && bun run typecheck && bun run build`; visualizer `bun run lint && bun run typecheck && bun test && bun run build`; data `uv run python -m py_compile *.py`. The video and visualizer `lint` scripts run `oxlint --type-aware --deny-warnings`.
- Groups: `ai` with `@ai-sdk/*` (shared `@ai-sdk/provider-utils`); `@tanstack/react-start` pins `@tanstack/react-router`; `@cloudflare/vite-plugin` pins `wrangler`; all `@remotion/*` and `remotion` at one exact version; `oxlint` with `oxlint-tsgolint`. Type-checks run `bun --check` (never `bun check`, which runs a `check` script when one exists), so every package's `packageManager` Bun and exact `typescript` pin move together at the version `bun -p process.versions.typescript` prints.
- Smoke test: visualizer `bun run build && vite preview`, then with `agent-browser` open `/puzzles`, step through puzzles and select a model answer. video `remotion still <composition> out.png --frame=<n>` and look at the frame.
