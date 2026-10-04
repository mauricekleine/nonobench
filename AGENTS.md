# Agent Instructions

- To inspect or verify a running UI, use the global `agent-browser` skill (the pinned `agent-browser` CLI); use Chrome DevTools MCP only for performance traces.

## Dependencies

Upgrades follow the `mk-dependency-upgrades` skill; holds live in `taze.config.ts`. `bench`, `video` and `visualizer` are separate Bun projects with no root workspace (the root `package.json` only pins taze); `data` is a uv project.

- Checks: bench `bun run typecheck && bun test`; video `bun run lint && bun run build`; visualizer `bun run lint && bun run typecheck && bun test && bun run build`; data `uv run python -m py_compile *.py`.
- Groups: `ai` with `@ai-sdk/*` (shared `@ai-sdk/provider-utils`); `@tanstack/react-start` pins `@tanstack/react-router`; `@cloudflare/vite-plugin` pins `wrangler`; all `@remotion/*` and `remotion` at one exact version.
- Smoke test: visualizer `bun run build && vite preview`, then with `agent-browser` open `/puzzles`, step through puzzles and select a model answer. video `remotion still <composition> out.png --frame=<n>` and look at the frame.
