export function sortSizes(sizes: string[]): string[] {
  return [...sizes].sort((a, b) => {
    const aNum = Number.parseInt(a.split("x")[0] ?? "0", 10);
    const bNum = Number.parseInt(b.split("x")[0] ?? "0", 10);
    return aNum - bNum;
  });
}
export const CORE_SIZES = ["5x5", "10x10", "15x15"] as const;
export const EXTENDED_SIZES = ["20x20"] as const;
