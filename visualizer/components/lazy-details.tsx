"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export function LazyDetails({ summary, children }: { summary: ReactNode; children: ReactNode }) {
  const [opened, setOpened] = useState(false);
  return <Collapsible onOpenChange={(open) => { if (open) setOpened(true); }}>
    <CollapsibleTrigger render={<Button variant="ghost" />}>
      {summary}
    </CollapsibleTrigger>
    <CollapsibleContent keepMounted={opened}>{opened && children}</CollapsibleContent>
  </Collapsible>;
}
