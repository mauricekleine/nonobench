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

if [[ ! -f "${repo_root}/bench/${db}" ]]; then
  echo "No bench/${db}. Run a local benchmark first:" >&2
  echo "  cd bench && bun run bench:local --model <name>" >&2
  exit 1
fi

restore() {
  git -C "${repo_root}" checkout -- \
    visualizer/app/results.json \
    visualizer/public/results-raw.json \
    visualizer/public/puzzle-results.json
  echo "Stopped. Restored the committed exports; bench/results.db is untouched."
}
trap 'exit 130' INT TERM
trap restore EXIT

cd "${repo_root}/bench"
NONOBENCH_DB="${db}" bun run export.ts

cd "${script_dir}"
# Run the server as a child process: exec would replace the shell and skip the
# restore. NONOBENCH_DEV_CMD is a test hook for the export/restore path.
if [[ -n "${NONOBENCH_DEV_CMD:-}" ]]; then
  bash -c "${NONOBENCH_DEV_CMD}"
else
  bun run dev
fi
