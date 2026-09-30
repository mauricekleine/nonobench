import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";

// Records the commit a build comes from at /api/deploy.json, so deploy:verify
// can check what the live Worker runs. Workers Builds sets WORKERS_CI_COMMIT_SHA;
// a local build uses HEAD and records whether the checkout had uncommitted changes.
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();

const sha = process.env.WORKERS_CI_COMMIT_SHA || git("rev-parse", "HEAD");
if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error("build commit is not a full SHA");
const dirty = !process.env.WORKERS_CI_COMMIT_SHA && git("status", "--porcelain", "--", ".") !== "";

const directory = new URL("../public/api/", import.meta.url);
await mkdir(directory, { recursive: true });
await writeFile(new URL("deploy.json", directory), `${JSON.stringify({ sha, dirty })}\n`);
