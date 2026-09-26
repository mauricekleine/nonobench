// Provider limits are final only when the failed request itself supplies
// timeout or connection-drop evidence near the documented cutoff.
export function isProviderTimeout(error: unknown, elapsedMs: number, limitSeconds?: number): boolean {
  if (!limitSeconds || elapsedMs < limitSeconds * 1000 - 5000) return false;
  if (typeof error === "string") return hasTimeoutMessage(error);
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    const value = current as { name?: unknown; message?: unknown; status?: unknown; statusCode?: unknown; response?: { status?: unknown }; cause?: unknown };
    if (value.status === 408 || value.status === 504 || value.statusCode === 408 || value.statusCode === 504 || value.response?.status === 408 || value.response?.status === 504) return true;
    const description = `${value.name ?? ""} ${value.message ?? ""}`;
    if (hasTimeoutMessage(description)) return true;
    current = value.cause;
  }
  return false;
}

function hasTimeoutMessage(message: string): boolean {
  return /AbortError|timed?\s*out|timeout|deadline exceeded|network connection lost|connection (?:lost|reset|closed|dropped)|ECONNRESET|UND_ERR_SOCKET|\b(?:408|504)\b/i.test(message);
}
