"use client";

import { MagnifyingGlassMinus, MagnifyingGlassPlus } from "@phosphor-icons/react";

import { useNonogramStore } from "./store";

const button =
  "rounded-md border border-border p-1.5 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ember-bright disabled:opacity-40 disabled:hover:text-muted-foreground";

export function ZoomControls() {
  const zoomLevel = useNonogramStore((state) => state.zoomLevel);
  const zoomIn = useNonogramStore((state) => state.zoomIn);
  const zoomOut = useNonogramStore((state) => state.zoomOut);
  return (
    <div className="flex items-center gap-1.5" role="group" aria-label="Zoom">
      <button type="button" className={button} onClick={zoomOut} disabled={zoomLevel === "xs"} aria-label="Zoom out" title="Zoom out">
        <MagnifyingGlassMinus size={16} />
      </button>
      <button type="button" className={button} onClick={zoomIn} disabled={zoomLevel === "xl"} aria-label="Zoom in" title="Zoom in">
        <MagnifyingGlassPlus size={16} />
      </button>
    </div>
  );
}
