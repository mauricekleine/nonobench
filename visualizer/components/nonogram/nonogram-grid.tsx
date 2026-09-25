"use client";

import { useCallback } from "react";

import { NonogramGridCell } from "./nonogram-grid-cell";
import { useNonogramStore } from "./store";
import type { CellState } from "@/lib/puzzle-insights";
import type { ZoomLevel } from "./types";

type Props = {
  onDragMove: (event: React.MouseEvent) => void;
  shouldHighlightMistakes?: boolean;
  overlay?: CellState[];
};

function OverlayCell({ state, row, column, zoom }: { state: CellState; row: number; column: number; zoom: ZoomLevel }) {
  const label = state === "correct-filled" ? "correct filled" : state === "wrong-filled" ? "extra filled" : state === "missed" ? "missed filled" : "empty";
  const size = { xs: "size-4", sm: "size-6", md: "size-8", lg: "size-10", xl: "size-12" }[zoom];
  const color = state === "correct-filled" ? "bg-[#46FEA5] text-[#07160d]" : state === "wrong-filled" ? "bg-[#FFCA16] font-bold text-[#251b00]" : state === "missed" ? "border-2 border-[#C69CFF] font-bold text-[#C69CFF]" : "bg-background";
  return <div role="img" aria-label={`Row ${row + 1}, column ${column + 1}: ${label}`} className="border-foreground not-last:border-r not-last:nth-[5n]:border-r-2 p-px"><div className={`flex items-center justify-center ${size} ${color}`}>{state === "wrong-filled" ? "×" : state === "missed" ? "·" : ""}</div></div>;
}

export function NonogramsGrid({ onDragMove, shouldHighlightMistakes, overlay }: Props) {
  const dragStartCellId = useNonogramStore((state) => state.dragStartCellId);
  const grid = useNonogramStore((state) => state.grid);
  const zoomLevel = useNonogramStore((state) => state.zoomLevel);

  const setHighlightedColumn = useNonogramStore(
    (state) => state.setHighlightedColumn
  );
  const setHighlightedRow = useNonogramStore(
    (state) => state.setHighlightedRow
  );
  const stopDragging = useNonogramStore((state) => state.stopDragging);

  const handleMouseLeave = useCallback(() => {
    stopDragging();

    setHighlightedColumn(undefined);
    setHighlightedRow(undefined);
  }, [setHighlightedColumn, setHighlightedRow, stopDragging]);

  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (dragStartCellId) {
        onDragMove(event);
      }
    },
    [dragStartCellId, onDragMove]
  );

  return (
    <div
      className="overflow-hidden rounded-br border-2 border-foreground"
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
    >
      {grid.map((row, index) => (
        <div
          className="grid grid-flow-col border-foreground not-last:border-b not-last:nth-[5n]:border-b-2"
          key={`row-${index}`}
        >
          {row.map((id, column) => overlay ? <OverlayCell key={id} state={overlay[index * row.length + column]} row={index} column={column} zoom={zoomLevel} /> : <NonogramGridCell
              id={id}
              key={id}
              shouldHighlightMistakes={shouldHighlightMistakes}
            />)}
        </div>
      ))}
    </div>
  );
}
