import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";

// Records the commit a build comes from at /api/deploy.json, so deploy:verify
// can check what the live Worker runs. Workers Builds sets WORKERS_CI_COMMIT_SHA,
// but a run without a commit (a deploy hook or a manual build) sets the branch
// name there, so only a full SHA is taken and anything else falls back to HEAD.
// A local build records whether the checkout had uncommitted changes.
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();

const builds = process.env.WORKERS_CI_COMMIT_SHA ?? "";
const sha = /^[0-9a-f]{40}$/.test(builds) ? builds : git("rev-parse", "HEAD");
if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error("build commit is not a full SHA");
const dirty = !builds && git("status", "--porcelain", "--", ".") !== "";

const directory = new URL("../public/api/", import.meta.url);
await mkdir(directory, { recursive: true });
await writeFile(new URL("deploy.json", directory), `${JSON.stringify({ sha, dirty })}\n`);
