export function formatDuration(milliseconds: number): string {
  if (milliseconds < 1000) return `${Math.round(milliseconds)}ms`;
  if (milliseconds < 60_000) return `${(milliseconds / 1000).toFixed(1)}s`;
  if (milliseconds < 3_600_000) {
    const seconds = Math.round(milliseconds / 1000);
    return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, "0")}s`;
  }
  const minutes = Math.round(milliseconds / 60_000);
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
}

export const effortLabel = (effort: string) => effort === "default" ? "on" : effort;
export const effortDescription = (effort: string) =>
  effort === "default" ? "reasoning on" : `${effort} effort`;
export const effortTitle = (effort: string) =>
  effort === "default"
    ? "Reasoning on — this model has no adjustable reasoning levels"
    : undefined;
