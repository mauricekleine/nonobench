# Build your own MCP: participant guide

You'll build a small MCP server for the Nonobench API, compare it with the published one, then add a tool that needs an API key.

- API: `https://beta.nonobench.com`, described at [`/api/openapi.json`](https://beta.nonobench.com/api/openapi.json)
- Published MCP, for comparison: `https://beta.nonobench.com/mcp`
- A finished example: [`mcp-python/server.py`](mcp-python/server.py)

You need [uv](https://docs.astral.sh/uv/) and Claude Code or Claude Desktop.

## 1. Try the public API

No key needed:

```sh
curl -s "https://beta.nonobench.com/api/v1/leaderboard?size=15x15&effort=best&min_correct=1"
curl -s "https://beta.nonobench.com/api/v1/models/claude-opus-5.5-high"
```

Model ids like `claude-opus-5.5-high` come from the leaderboard. The OpenAPI spec has an example of each response.

## 2. Build your MCP

Give your coding agent this prompt:

> Build a small MCP server in Python for the Nonobench API described at https://beta.nonobench.com/api/openapi.json.
> - Use a uv project with `mcp==2.2.0` and `httpx`. This is the MCP Python SDK 2.x: import `MCPServer` from `mcp.server` (FastMCP was renamed in 2.x). Run it over stdio.
> - Read the API base URL from `NONOBENCH_API_BASE`, defaulting to `https://beta.nonobench.com`.
> - Add two read-only tools. `get_leaderboard(size, effort, provider, limit)` calls `GET /api/v1/leaderboard` with `min_correct=1` and returns the first `limit` models. `get_model_results(model)` calls `GET /api/v1/models/{model}`, with the model id URL-encoded.
> - Turn API errors into tool errors with the HTTP status.
> - Then give me the command to add it to Claude Code.

Add it to your client:

- **Claude Code**: `claude mcp add nonobench-mine -- uv run --directory /absolute/path/to/your/project server.py`, then start `claude` and run `/mcp` to check it's connected.
- **Claude Desktop**: see [Claude Desktop](#claude-desktop) below.

## 3. Compare with the published MCP

- **Claude Code**: `claude mcp add --transport http nonobench-published https://beta.nonobench.com/mcp`
- **Claude Desktop**: Settings → Connectors → Add custom connector → `https://beta.nonobench.com/mcp`

Ask Claude the same question with each, for example "Which model is best at 15x15 nonograms, and what does it cost?". Compare the tool lists, descriptions and answers.

## 4. Add a protected tool

The endpoint `GET /api/workshop/report` needs the workshop key, sent as `Authorization: Bearer <key>`. Give your agent this prompt:

> Add a read-only tool `get_workshop_report` to my MCP server. It calls `GET /api/workshop/report` with the header `Authorization: Bearer <key>`, where the key comes from the environment variable `NONOBENCH_WORKSHOP_API_KEY`, read inside the tool when it is called.
> - The key must never be a tool argument, and never appear in a tool result, an error message or a log line.
> - Don't write it to any file, and don't ask me for it or try to read its value.
> - If the variable is missing, fail with a message saying to set it and restart the MCP server. On HTTP 401, fail with "the key is wrong or has been revoked".

## 5. Set the key

The key is on the slide. Type or paste it at the prompt; these commands don't echo it or store it in your shell history. Never paste it into a chat with an agent.

### Claude Code

Set the key in the terminal you start Claude Code from; the MCP server inherits it.

macOS / Linux:

```sh
read -rs NONOBENCH_WORKSHOP_API_KEY && export NONOBENCH_WORKSHOP_API_KEY
test -n "$NONOBENCH_WORKSHOP_API_KEY" && echo "key is set (${#NONOBENCH_WORKSHOP_API_KEY} characters)"
claude
```

PowerShell 7:

```powershell
$env:NONOBENCH_WORKSHOP_API_KEY = Read-Host "Workshop key" -MaskInput
if ($env:NONOBENCH_WORKSHOP_API_KEY) { "key is set ($($env:NONOBENCH_WORKSHOP_API_KEY.Length) characters)" }
claude
```

Windows PowerShell 5.1 has no `-MaskInput`; use:

```powershell
$secure = Read-Host "Workshop key" -AsSecureString
$env:NONOBENCH_WORKSHOP_API_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
```

If Claude Code was already running, quit it and start it again from this terminal: the MCP server only reads the variable when it starts. Then ask: "Call get_workshop_report."

### Claude Desktop

Claude Desktop doesn't pass your terminal's environment to MCP servers. Keep the key out of its config file: store it in your operating system, and have a small launch command load it into the server's environment.

macOS: store the key in your Keychain (it prompts without echoing):

```sh
security add-generic-password -a "$USER" -s nonobench-workshop -w
command -v uv   # note this path for the config below
```

Then Settings → Developer → Edit Config, and add (with your paths):

```json
{
  "mcpServers": {
    "nonobench-mine": {
      "command": "/bin/sh",
      "args": ["-c", "export NONOBENCH_WORKSHOP_API_KEY=\"$(security find-generic-password -a \"$USER\" -s nonobench-workshop -w)\"; exec /absolute/path/to/uv run --directory /absolute/path/to/your/project server.py"]
    }
  }
}
```

Windows: store the key as a user environment variable, then point the config at a PowerShell launch command:

```powershell
$secure = Read-Host "Workshop key" -AsSecureString
[Environment]::SetEnvironmentVariable("NONOBENCH_WORKSHOP_API_KEY", [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)), "User")
(Get-Command uv).Source   # note this path for the config below
```

```json
{
  "mcpServers": {
    "nonobench-mine": {
      "command": "powershell",
      "args": ["-NoProfile", "-Command", "$env:NONOBENCH_WORKSHOP_API_KEY = [Environment]::GetEnvironmentVariable('NONOBENCH_WORKSHOP_API_KEY', 'User'); & 'C:\\absolute\\path\\to\\uv.exe' run --directory 'C:\\absolute\\path\\to\\your\\project' server.py"]
    }
  }
}
```

Quit Claude Desktop completely and reopen it. Then ask: "Call get_workshop_report."

### What the environment protects, and what it doesn't

Keeping the key in the environment keeps it out of chats, tool calls, transcripts and your source code. It doesn't hide the key from a coding agent that can run terminal commands: that agent could print the variable or read the Keychain, like you can. Treat an agent with a terminal as having your keys, and use keys that are scoped, short-lived and revocable, like this workshop key.

## 6. Revocation

At the end, the instructor revokes the key. Ask Claude to call `get_workshop_report` again: it fails with "wrong or revoked" or "not configured". `get_leaderboard` and `get_model_results` keep working.

## Clean up

- Remove your MCP servers: `claude mcp remove nonobench-mine` and `claude mcp remove nonobench-published`. In Claude Desktop, delete the entry from the config and remove the connector.
- Remove the key:
  - macOS/Linux: `unset NONOBENCH_WORKSHOP_API_KEY`
  - macOS Keychain: `security delete-generic-password -a "$USER" -s nonobench-workshop`
  - Windows: `[Environment]::SetEnvironmentVariable("NONOBENCH_WORKSHOP_API_KEY", $null, "User")`
