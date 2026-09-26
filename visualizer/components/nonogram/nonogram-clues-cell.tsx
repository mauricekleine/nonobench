"use client";

import { cn } from "@/lib/utils";
import { XIcon } from "@phosphor-icons/react";

import { useNonogramStore } from "./store";
import type { NonogramClue } from "./types";

type Props = {
  className: string;
  id: NonogramClue["id"];
  shouldHighlightMistakes?: boolean;
};

export function NonogramCluesCell({
  className,
  id,
  shouldHighlightMistakes,
}: Props) {
  const cell = useNonogramStore((state) => state.clues.cells[id]);
  const toggleClue = useNonogramStore((state) => state.toggleClue);

  function handleToggleClue() {
    toggleClue(id);
  }

  if (!cell) {
    return null;
  }

  return (
    <div
      className={cn(
        "relative flex aspect-square items-center justify-center border-foreground p-px",
        className,
        {
          "text-red-500": !cell.isValid && shouldHighlightMistakes,
        }
      )}
      onClick={handleToggleClue}
    >
      <span>{cell.value > 0 ? cell.value : ""}</span>

      {cell.isComplete && (
        <div className="absolute inset-0 flex items-center justify-center">
          <XIcon className="size-6 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
