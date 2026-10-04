import { defineConfig } from 'taze'

export default defineConfig({
  recursive: true,
  includeLocked: true,
  requestTimeout: 30_000,
  // bench, video and visualizer are separate projects with no root workspace.
  ignoreOtherWorkspaces: false,
  // Mirrors bunfig.toml [install]; taze does not read it. Keep both in sync.
  maturityPeriod: 3, // minimumReleaseAge = 259200
  maturityPeriodExclude: [], // minimumReleaseAgeExcludes
  // Holds: `name` or `name@range` (e.g. 'typescript@7'), each with its reason above it.
  exclude: [],
})
