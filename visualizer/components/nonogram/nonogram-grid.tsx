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
  violatedRows?: number[];
  violatedColumns?: number[];
};

function OverlayCell({ state, row, column, zoom, violatedRow, violatedColumn }: { state: CellState; row: number; column: number; zoom: ZoomLevel; violatedRow: boolean; violatedColumn: boolean }) {
  const label = state === "correct-filled" ? "valid filled" : state === "wrong-filled" ? "extra filled" : state === "missed" ? "missed filled" : state === "neutral-filled" ? "model filled" : "empty";
  const size = { xs: "size-4", sm: "size-6", md: "size-8", lg: "size-10", xl: "size-12" }[zoom];
  const color = state === "correct-filled" ? "bg-[#46FEA5] text-[#07160d]" : state === "wrong-filled" ? "bg-[#FFCA16] font-bold text-[#251b00]" : state === "missed" ? "border-2 border-[#C69CFF] font-bold text-[#C69CFF]" : state === "neutral-filled" ? "bg-foreground/75" : "bg-background";
  const violations = `${violatedRow ? ", row clue not satisfied" : ""}${violatedColumn ? ", column clue not satisfied" : ""}`;
  return <div role="img" aria-label={`Row ${row + 1}, column ${column + 1}: ${label}${violations}`} className="border-foreground not-last:border-r not-last:nth-[5n]:border-r-2 p-px"><div className={`flex items-center justify-center ${size} ${color} ${violatedRow || violatedColumn ? "outline outline-2 outline-dashed -outline-offset-2 outline-[#D871A1]" : ""}`}>{state === "wrong-filled" ? "×" : state === "missed" ? "·" : ""}</div></div>;
}

export function NonogramsGrid({ onDragMove, shouldHighlightMistakes, overlay, violatedRows, violatedColumns }: Props) {
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
          {row.map((id, column) => overlay ? <OverlayCell key={id} state={overlay[index * row.length + column]} row={index} column={column} zoom={zoomLevel} violatedRow={violatedRows?.includes(index + 1) ?? false} violatedColumn={violatedColumns?.includes(column + 1) ?? false} /> : <NonogramGridCell
              id={id}
              key={id}
              shouldHighlightMistakes={shouldHighlightMistakes}
            />)}
        </div>
      ))}
    </div>
  );
}
