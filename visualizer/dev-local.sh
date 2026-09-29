#!/usr/bin/env bash
# Serve the dashboard from your own runs, without touching the shared dataset.
#
# The visualizer reads its data from three committed JSON files
# (app/results.json, public/results-raw.json, public/puzzle-results.json), so a
# local dashboard has to write them. This script fills them from
# bench/local-results.db, starts the dev server, and restores the committed files
# when you stop it. bench/results.db and the export-contract test stay intact.
#
# Usage:
#   bun run dev:local                                  # serve bench/local-results.db
#   NONOBENCH_LOCAL_DB=local-pilot.db bun run dev:local # serve another database
#
# Stop with Ctrl-C. The restore runs on exit, so never commit the visualizer JSON
# files while the server is up.
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "${script_dir}/.." && pwd)"
db="${NONOBENCH_LOCAL_DB:-local-results.db}"

export_files=(
  visualizer/app/results.json
  visualizer/public/results-raw.json
  visualizer/public/puzzle-results.json
)

if [[ ! -f "${repo_root}/bench/${db}" ]]; then
  echo "No bench/${db}. Run a local benchmark first:" >&2
  echo "  cd bench && bun run bench:local --model <name>" >&2
  exit 1
fi

# The restore below checks the exports out of git, which would discard any
# uncommitted edit to them. Refuse to start while there is one (staged or not).
if ! git -C "${repo_root}" diff --quiet HEAD -- "${export_files[@]}"; then
  echo "Uncommitted changes to the export files; commit or stash them first:" >&2
  git -C "${repo_root}" diff --name-only HEAD -- "${export_files[@]}" | sed 's/^/  /' >&2
  exit 1
fi

restore() {
  git -C "${repo_root}" checkout -- "${export_files[@]}"
  echo "Stopped. Restored the committed exports; bench/results.db is untouched."
}
trap 'exit 130' INT TERM
trap restore EXIT

cd "${repo_root}/bench"
NONOBENCH_DB="${db}" bun run export.ts

cd "${script_dir}"
# Run the server as a child process: exec would replace the shell and skip the
# restore.
bun run dev
