"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { DragTooltip } from "./drag-tooltip";
import { NonogramColumnClues } from "./nonogram-column-clues";
import { NonogramsGrid } from "./nonogram-grid";
import { NonogramRowClues } from "./nonogram-row-clues";
import { useNonogramStore } from "./store";
import type { CellState } from "@/lib/puzzle-insights";

type Props = {
  height: number;
  solution: string;
  width: number;
  overlay?: CellState[];
  violatedRows?: number[];
  violatedColumns?: number[];
};

export function Nonogram({
  height,
  solution,
  width,
  overlay,
  violatedRows,
  violatedColumns,
}: Props) {
  // Fill the store during the first render, not in an effect, so the grid is
  // never painted empty and never shifts the page when it fills in.
  const [initialized, setInitialized] = useState<string | null>(null);
  if (initialized !== solution) {
    setInitialized(solution);
    useNonogramStore.getState().initialize({ height, solution, width });
  }

  const tooltipAnimationFrameReference = useRef<number>(null);
  const tooltipReference = useRef<HTMLDivElement>(null);

  const handleDragMove = useCallback((event: React.MouseEvent) => {
    if (tooltipReference.current) {
      if (tooltipAnimationFrameReference.current) {
        cancelAnimationFrame(tooltipAnimationFrameReference.current);
      }

      tooltipAnimationFrameReference.current = requestAnimationFrame(() => {
        if (tooltipReference.current) {
          tooltipReference.current.style.left = `${event.clientX}px`;
          tooltipReference.current.style.top = `${event.clientY}px`;
        }
      });
    }
  }, []);

  useEffect(
    () => () => {
      if (tooltipAnimationFrameReference.current) {
        cancelAnimationFrame(tooltipAnimationFrameReference.current);
      }
    },
    []
  );

  return (
    <div className="grid w-max relative">
      <div className="col-start-2">
        <NonogramColumnClues violatedColumns={violatedColumns} />
      </div>

      <NonogramRowClues violatedRows={violatedRows} />

      <NonogramsGrid onDragMove={handleDragMove} overlay={overlay} violatedRows={violatedRows} violatedColumns={violatedColumns} />

      <DragTooltip ref={tooltipReference} />
    </div>
  );
}
