"use client";

import { cn } from "@/lib/utils";
import { useMemo } from "react";

import { NonogramCluesCell } from "./nonogram-clues-cell";
import { useNonogramStore } from "./store";

type Props = {
  shouldHighlightMistakes?: boolean;
  violatedColumns?: number[];
};

export function NonogramColumnClues({ shouldHighlightMistakes, violatedColumns }: Props) {
  const cluesGrid = useNonogramStore((state) => state.clues.columns);
  const highlightedColumn = useNonogramStore(
    (state) => state.highlightedColumn
  );
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
    <div className="grid grid-flow-col overflow-hidden rounded-t-md border-2 border-foreground border-b-0">
      {clues.map((column, index) => (
        <div
          className={cn(
            "flex flex-col justify-end border-foreground not-last:border-r not-last:nth-[5n]:border-r-2 font-mono text-xs",
            {
              "bg-accent": highlightedColumn === index,
              "bg-[#D871A1]/20 outline outline-2 outline-dashed outline-[#D871A1]": violatedColumns?.includes(index + 1),
            }
          )}
          key={`column-${index}`}
          role={violatedColumns?.includes(index + 1) ? "group" : undefined}
          aria-label={violatedColumns?.includes(index + 1) ? `Column ${index + 1} clue not satisfied` : undefined}
        >
          {column.map((id) => (
            <NonogramCluesCell
              className={cn("not-first:border-t", {
                "h-4": zoomLevel === "xs",
                "h-6": zoomLevel === "sm",
                "h-8": zoomLevel === "md",
                "h-10": zoomLevel === "lg",
                "h-12": zoomLevel === "xl",
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
