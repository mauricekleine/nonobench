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

export const effortLabel = (effort: string) => effort === "default" ? "on" : effort === "none" ? "off" : effort;
export const sizeLabel = (size: string) => size === "20x20" ? "Hard mode (20×20)" : size.replace("x", "×");
export const shortSizeLabel = (size: string) => size === "20x20" ? "Hard mode" : size.replace("x", "×");
export const formatCost = (value: number, perPuzzle = false) =>
  value === 0 ? "$0" : perPuzzle ? value < 0.0001 ? "<$0.0001" : `$${value.toFixed(4)}` : value < 0.01 ? "<$0.01" : `$${value.toFixed(2)}`;
export const effortDescription = (effort: string) =>
  effort === "default" ? "reasoning on" : effort === "none" ? "reasoning off" : `${effort} effort`;
export const effortTitle = (effort: string) =>
  effort === "default"
    ? "Reasoning on — this model has no adjustable reasoning levels"
    : undefined;
