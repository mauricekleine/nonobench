"use client";

import { useState, type ReactNode } from "react";

// A collapsed data table that renders its contents on first open, so the rows
// add nothing to the page until someone asks for them.
export function LazyDetails({ summary, children }: { summary: ReactNode; children: ReactNode }) {
  const [opened, setOpened] = useState(false);
  return (
    <details className="mt-5 border-t border-border pt-3 text-sm" onToggle={(event) => { if (event.currentTarget.open) setOpened(true); }}>
      <summary className="cursor-pointer text-ember focus-visible:outline-2 focus-visible:outline-ember-bright">{summary}</summary>
      {opened && children}
    </details>
  );
}
