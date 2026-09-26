"use client";

import { cn } from "@/lib/utils";
import { useMemo } from "react";

import { NonogramCluesCell } from "./nonogram-clues-cell";
import { useNonogramStore } from "./store";

type Props = {
  shouldHighlightMistakes?: boolean;
  violatedRows?: number[];
};

export function NonogramRowClues({ shouldHighlightMistakes, violatedRows }: Props) {
  const cluesGrid = useNonogramStore((state) => state.clues.rows);
  const highlightedRow = useNonogramStore((state) => state.highlightedRow);
  const zoomLevel = useNonogramStore((state) => state.zoomLevel);

  const clues = useMemo(() => {
    let clueCount = 0;
    for (const clueList of cluesGrid) {
      clueCount = Math.max(clueCount, clueList.length);
    }

    // And add empty cells to the start of each row or column
    return cluesGrid.map((clueList) => [
      ...Array.from({ length: clueCount - clueList.length }).map(
        (_, index) => `empty-${index}`
      ),
      ...clueList,
    ]);
  }, [cluesGrid]);

  return (
    <div className="grid grid-flow-row overflow-hidden rounded-l-md border-2 border-foreground border-r-0">
      {clues.map((row, index) => (
        <div
          className={cn(
            "flex flex-row justify-end border-foreground not-last:border-b not-last:nth-[5n]:border-b-2 font-mono text-xs",
            {
              "bg-border": highlightedRow === index,
              "bg-[#D871A1]/20 outline outline-2 outline-dashed outline-[#D871A1]": violatedRows?.includes(index + 1),
            }
          )}
          key={`row-${index}`}
          role={violatedRows?.includes(index + 1) ? "group" : undefined}
          aria-label={violatedRows?.includes(index + 1) ? `Row ${index + 1} clue not satisfied` : undefined}
        >
          {row.map((id) => (
            <NonogramCluesCell
              className={cn("not-first:border-l", {
                "w-4": zoomLevel === "xs",
                "w-6": zoomLevel === "sm",
                "w-8": zoomLevel === "md",
                "w-10": zoomLevel === "lg",
                "w-12": zoomLevel === "xl",
              })}
              id={id}
              key={id}
              shouldHighlightMistakes={shouldHighlightMistakes}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
