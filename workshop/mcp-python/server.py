"""A small MCP server for the Nonobench API, built in the workshop.

Two public tools read the open API. The protected tool reads the workshop key
from this process's environment (NONOBENCH_WORKSHOP_API_KEY) and sends it to
the API as a bearer token. The key never goes into a tool argument, a tool
result, an error message or a log line.
"""

import os
from typing import Any
from urllib.parse import quote

import httpx
from mcp.server import MCPServer
from mcp.server.mcpserver.exceptions import ToolError
from mcp_types import ToolAnnotations

API_BASE = os.environ.get("NONOBENCH_API_BASE", "https://beta.nonobench.com").rstrip("/")
READ_ONLY = ToolAnnotations(read_only_hint=True, open_world_hint=True)

server = MCPServer(
    name="nonobench-workshop",
    instructions="Look up Nonobench results: how well LLMs solve nonogram puzzles.",
    log_level="WARNING",
)


def get_json(path: str, params: dict[str, Any] | None = None, headers: dict[str, str] | None = None) -> dict[str, Any]:
    try:
        response = httpx.get(f"{API_BASE}{path}", params=params, headers=headers, timeout=20)
    except httpx.HTTPError as error:
        raise ToolError(f"Could not reach the Nonobench API: {type(error).__name__}") from None
    if response.status_code == 401:
        raise ToolError("The workshop API rejected the key (HTTP 401): it is wrong or has been revoked.")
    if response.status_code == 503:
        raise ToolError("The workshop API is not accepting keys right now (HTTP 503).")
    if response.status_code >= 400:
        raise ToolError(f"The Nonobench API answered HTTP {response.status_code}: {response.text[:200]}")
    return response.json()


@server.tool(annotations=READ_ONLY)
def get_leaderboard(size: str | None = None, effort: str = "best", provider: str | None = None, limit: int = 10) -> dict[str, Any]:
    """Models ranked by accuracy on the Nonobench nonogram benchmark.

    Args:
        size: Grid size: 5x5, 10x10, 15x15 or 20x20 (Hard mode). Omit for the overall Standard score.
        effort: "best" (each family's best reasoning level), "all", or one level such as "high".
        provider: Comma-separated provider ids, e.g. "openai,anthropic".
        limit: How many rows to return.
    """
    params = {"effort": effort, "min_correct": 1, "size": size, "provider": provider}
    data = get_json("/api/v1/leaderboard", {key: value for key, value in params.items() if value is not None})
    return {"updatedAt": data["updatedAt"], "size": data["size"], "models": data["models"][: max(1, limit)]}


@server.tool(annotations=READ_ONLY)
def get_model_results(model: str) -> dict[str, Any]:
    """Accuracy, cost and time for one model variant, per grid size.

    Args:
        model: A model id from get_leaderboard, e.g. "claude-opus-5.5-high".
    """
    return get_json(f"/api/v1/models/{quote(model, safe='')}")


@server.tool(annotations=READ_ONLY)
def get_workshop_report() -> dict[str, Any]:
    """The workshop's protected sample report. Needs the workshop key in the MCP server's environment."""
    key = os.environ.get("NONOBENCH_WORKSHOP_API_KEY", "").strip()
    if not key:
        raise ToolError("NONOBENCH_WORKSHOP_API_KEY is not set in this MCP server's environment. Set it, then restart the MCP server.")
    return get_json("/api/workshop/report", headers={"Authorization": f"Bearer {key}"})


if __name__ == "__main__":
    server.run()
