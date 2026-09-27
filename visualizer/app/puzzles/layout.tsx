import type { Metadata } from "next";

export const metadata: Metadata = { title: "Puzzle explorer | Nonobench", description: "Every Nonobench puzzle, with each model's answer overlaid on the grid." };

export default function PuzzlesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
