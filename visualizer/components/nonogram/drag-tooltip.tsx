"use client";

import { cn } from "@/lib/utils";

import { useNonogramStore } from "./store";

type Props = {
  ref: React.RefObject<HTMLDivElement | null>;
};

export function DragTooltip({ ref }: Props) {
  const markedCellsCount = useNonogramStore((state) => state.markedCellsCount);

  return (
    <div
      className={cn(
        "-mr-6 -mt-8 pointer-events-none fixed flex size-10 items-center justify-center whitespace-nowrap rounded-full border border-border bg-background font-mono text-xs shadow-sm",
        {
          hidden: markedCellsCount.count < 2,
        },
      )}
      ref={ref}
    >
      {markedCellsCount.count === markedCellsCount.blockCount
        ? markedCellsCount.count
        : `${markedCellsCount.count}/${markedCellsCount.blockCount}`}
    </div>
  );
}
