"use client";

import { MagnifyingGlassMinus, MagnifyingGlassPlus } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { useNonogramStore } from "./store";

export function ZoomControls() {
  const zoomLevel = useNonogramStore((state) => state.zoomLevel);
  const zoomIn = useNonogramStore((state) => state.zoomIn);
  const zoomOut = useNonogramStore((state) => state.zoomOut);
  return <div className="flex items-center gap-2" role="group" aria-label="Zoom">
    <Button variant="outline" size="icon" onClick={zoomOut} disabled={zoomLevel === "xs"} aria-label="Zoom out" title="Zoom out"><MagnifyingGlassMinus size={16} /></Button>
    <Button variant="outline" size="icon" onClick={zoomIn} disabled={zoomLevel === "xl"} aria-label="Zoom in" title="Zoom in"><MagnifyingGlassPlus size={16} /></Button>
  </div>;
}
