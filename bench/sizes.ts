export function sortSizes(sizes: string[]): string[] {
  return [...sizes].sort((a, b) => {
    const aNum = Number.parseInt(a.split("x")[0] ?? "0", 10);
    const bNum = Number.parseInt(b.split("x")[0] ?? "0", 10);
    return aNum - bNum;
  });
}
