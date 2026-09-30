# MCP workshop: instructor runbook

The workshop runs on the beta, `https://beta.nonobench.com` (Worker `nonobench-beta`), deployed from the branch `workshop/mcp-auth`. The branch is never merged: production (`www.nonobench.com`) and its published MCP stay as they are.

Teaching sequence: public API → participants build their own MCP → compare with the published MCP → add a protected tool → configure a secret → revocation. Participants follow [participants.md](participants.md); the finished example is [mcp-python/server.py](mcp-python/server.py).

## What the branch adds to the beta

- `GET /api/workshop/report`: read-only sample data, labelled `"sample": true`. It touches no benchmark data and runs no models. The Worker only serves it where `WORKSHOP_ENABLED` is `"true"`, which only the beta environment in `visualizer/wrangler.jsonc` sets. Everywhere else the path is a 404.
- Access rules:
  - It needs `Authorization: Bearer <key>`, compared in constant time with the secret `WORKSHOP_API_KEY` on `nonobench-beta`.
  - A missing, malformed, wrong or revoked key gets 401. Without the secret every request gets 503, so an absent secret never grants access.
  - Plain `http://` is refused (403), not redirected.
  - Responses are `no-store` and have no CORS header.
- The published MCP at `/mcp` is unchanged and doesn't expose the report.
- `/api/openapi.json` on the beta:
  - documents the endpoint with a bearer security scheme;
  - lists the beta as its server;
  - carries leaderboard and model-results examples built from the live data, so the model ids are real.

## Before the workshop (on the M5)

Deploy the beta from the branch. Use a checkout without a `visualizer/.dev.vars` file:

```sh
git -C ~/Projects/nonobench fetch origin && \
{ git -C ~/Projects/nonobench worktree remove --force ~/Projects/nonobench-beta 2>/dev/null; true; } && \
git -C ~/Projects/nonobench worktree add --detach ~/Projects/nonobench-beta origin/workshop/mcp-auth && \
cd ~/Projects/nonobench-beta/visualizer && bun install && \
export CLOUDFLARE_ACCOUNT_ID=0651fd3b33d9e0b2fe72a5f13e5cf65d && \
bun run deploy:beta && \
bun run deploy:verify "$(git rev-parse HEAD)"
```

Create the key in a private file and store it as the beta's secret. Nothing is printed:

```sh
umask 077 && printf '%s' "$(openssl rand -hex 24)" > ~/nonobench-workshop-key
bunx wrangler secret put WORKSHOP_API_KEY --name nonobench-beta < ~/nonobench-workshop-key
bunx wrangler secret list --name nonobench-beta   # names only: WORKSHOP_API_KEY
bunx wrangler secret list --name nonobench        # production: none
```

Copy it for the slide with `pbcopy < ~/nonobench-workshop-key`. Then check everything (the script prints statuses only):

```sh
cd ~/Projects/nonobench-beta
NONOBENCH_WORKSHOP_API_KEY="$(cat ~/nonobench-workshop-key)" node workshop/verify.mjs
```

It checks, all against the beta:
- the public leaderboard and model results return 200 without a key;
- the spec documents the protected endpoint;
- no key and a wrong key get 401, and the workshop key gets 200;
- `http://` is refused;
- the published MCP still lists its tools and doesn't expose the report.

## Revocation demo

Pick one:

- **Delete the secret.** Every request to the report gets 503:
  ```sh
  bunx wrangler secret delete WORKSHOP_API_KEY --name nonobench-beta
  ```
- **Rotate the key.** The old key gets 401 and a new one works:
  ```sh
  umask 077 && printf '%s' "$(openssl rand -hex 24)" > ~/nonobench-workshop-key-2
  bunx wrangler secret put WORKSHOP_API_KEY --name nonobench-beta < ~/nonobench-workshop-key-2
  ```

Either change is live within seconds, without a redeploy. Participants then call `get_workshop_report` and see it fail, while `get_leaderboard` and `get_model_results` keep working. Confirm it with the old key:

```sh
NONOBENCH_WORKSHOP_API_KEY="$(cat ~/nonobench-workshop-key)" node workshop/verify.mjs --revoked
```

## Cleanup after the workshop

```sh
cd ~/Projects/nonobench-beta/visualizer
bunx wrangler secret delete WORKSHOP_API_KEY --name nonobench-beta   # if not deleted in the demo
git fetch origin && git checkout --detach origin/main && bun install && \
CLOUDFLARE_ACCOUNT_ID=0651fd3b33d9e0b2fe72a5f13e5cf65d bun run deploy:beta
bunx wrangler secret list --name nonobench-beta   # []
rm -f ~/nonobench-workshop-key ~/nonobench-workshop-key-2
```

Redeploying the beta from `main` removes the endpoint and `WORKSHOP_ENABLED`, and the beta matches production again. Keep the branch for the next workshop, or delete it.

## Two kinds of auth: say this in the room

- **Tonight: your MCP authenticates to an upstream API.** The participant's MCP server runs locally and holds an API key for the Nonobench API. The key belongs to whoever runs the server, lives in that server's environment, and never passes through the model. It's the same pattern as an MCP server that holds a GitHub token.
- **Not tonight: a hosted MCP authorises its clients.** When an MCP server runs remotely, like the published `https://beta.nonobench.com/mcp`, and serves protected data, it has to decide which clients may call it. The MCP spec does this with OAuth 2.1: the client gets a token for that user from an authorisation server, and the MCP server validates it on every request. A shared key baked into the hosted server would give every client the same access. The published Nonobench MCP serves only public data, so it has no client authorisation, and it doesn't expose the workshop report.
