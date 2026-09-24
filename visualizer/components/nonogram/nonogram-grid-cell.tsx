"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { XIcon } from "@phosphor-icons/react";

import { useNonogramStore } from "./store";
import {
  type NonogramCell as NonogramCellType,
  NonogramCellValue,
} from "./types";

type Props = {
  id: NonogramCellType["id"];
  shouldHighlightMistakes?: boolean;
};

export function NonogramGridCell({ id, shouldHighlightMistakes }: Props) {
  const cell = useNonogramStore((state) => state.cells[id]);
  const height = useNonogramStore((state) => state.height);
  const width = useNonogramStore((state) => state.width);
  const zoomLevel = useNonogramStore((state) => state.zoomLevel);

  const continueDragging = useNonogramStore((state) => state.continueDragging);
  const stopDragging = useNonogramStore((state) => state.stopDragging);
  const startDragging = useNonogramStore((state) => state.startDragging);

  const value = cell.transientValue ?? cell.userValue;

  function handleMouseDown(event: React.MouseEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();

    startDragging(cell);
  }

  function handleMouseEnter(event: React.MouseEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();

    continueDragging(cell);
  }

  function handleMouseUp(event: React.MouseEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();

    stopDragging();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    startDragging(cell);
    stopDragging();
  }

  return (
    <div
      className={cn(
        "relative border-foreground not-last:border-r not-last:nth-[5n]:border-r-2 p-px",
        {
          "bg-red-500": !cell.isValid && shouldHighlightMistakes,
        }
      )}
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
      onMouseUp={handleMouseUp}
    >
      <motion.div
        animate={value}
        className={cn(
          "relative aspect-square items-center justify-center rounded-xs",
          {
            "size-4": zoomLevel === "xs",
            "size-6": zoomLevel === "sm",
            "size-8": zoomLevel === "md",
            "size-10": zoomLevel === "lg",
            "size-12": zoomLevel === "xl",
          }
        )}
        initial={false}
        role="button"
        tabIndex={0}
        aria-label={`Row ${cell.row + 1}, column ${cell.column + 1}, ${value.toLowerCase()}`}
        onKeyDown={handleKeyDown}
        transition={{ duration: 0.1 }}
        variants={{
          [NonogramCellValue.FILLED]: { backgroundColor: "var(--foreground)" },
          [NonogramCellValue.MARKED]: { backgroundColor: "var(--background)" },
          [NonogramCellValue.EMPTY]: { backgroundColor: "var(--background)" },
        }}
      >
        <AnimatePresence>
          {value === NonogramCellValue.MARKED && (
            <motion.div
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 flex items-center justify-center"
              exit={{ opacity: 0, scale: 0.8 }}
              initial={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
            >
              <XIcon
                className={cn({
                  "size-4": zoomLevel === "xs",
                  "size-6": zoomLevel === "sm",
                  "size-8": zoomLevel === "md",
                  "size-10": zoomLevel === "lg",
                  "size-12": zoomLevel === "xl",
                  "text-foreground": cell.isValid,
                  "text-red-500": !cell.isValid && shouldHighlightMistakes,
                })}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {cell.column === width - 1 && (cell.row + 1) % 5 === 0 && (
        <div
          className={cn(
            "absolute right-1 bottom-0 text-[10px] text-muted-foreground",
            zoomLevel === "xs" && "right-px text-[8px]",
            zoomLevel === "sm" && "right-0.5 text-[10px]"
          )}
        >
          {cell.row + 1}
        </div>
      )}

      {cell.row === height - 1 && (cell.column + 1) % 5 === 0 && (
        <div
          className={cn(
            "absolute right-1 bottom-0 text-[10px] text-muted-foreground",
            zoomLevel === "xs" && "right-px text-[8px]",
            zoomLevel === "sm" && "right-0.5 text-[10px]"
          )}
        >
          {cell.column + 1}
        </div>
      )}
    </div>
  );
}
