"use client";

import { CaretDown } from "@phosphor-icons/react";
import { useId, useState } from "react";
import { ProviderLogo } from "@/components/provider-logos/provider-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { effortLabel } from "@/lib/display";
import { VERSIONS, type Filters } from "@/lib/leaderboard";
import { PROVIDERS } from "@/lib/providers";

type FamilySource = { family: string; familyDisplayName: string; provider: string };

export function Segmented<T extends string>({ value, options, onChange, label }: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
  size?: "sm" | "md";
}) {
  return <ToggleGroup aria-label={label} value={[value]} onValueChange={(next) => { if (next[0]) onChange(next[0] as T); }} onKeyDown={(event) => {
    const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    const index = options.findIndex((option) => option.value === value);
    onChange(options[(index + step + options.length) % options.length].value);
  }} variant="outline" spacing={0}>
    {options.map((option) => <ToggleGroupItem key={option.value} value={option.value}>{option.label}</ToggleGroupItem>)}
  </ToggleGroup>;
}

export function EffortToggle({ filters, change }: { filters: Filters; change: (patch: Partial<Filters>) => void }) {
  const effort = filters.effort ?? "best";
  const pinned = effort !== "best" && effort !== "all" ? effort : null;
  return <Segmented label="Effort levels" value={effort} onChange={(value) => change({ effort: value })} options={[
    { value: "best", label: "Best" },
    { value: "all", label: "All effort levels" },
    ...(pinned ? [{ value: pinned, label: `${effortLabel(pinned)} only` }] : []),
  ]} />;
}

export function ModelsPopover({ filters, change, sources }: {
  filters: Filters;
  change: (patch: Partial<Filters>) => void;
  sources: FamilySource[];
}) {
  const [query, setQuery] = useState("");
  const id = useId();
  const families = [...new Map(sources.map((source) => [source.family, source])).values()];
  const providers = [...new Set(families.map((family) => family.provider))];
  const selected = new Set(families.filter((family) =>
    (!filters.families || filters.families.includes(family.family)) &&
    (!filters.providers || filters.providers.includes(family.provider)),
  ).map((family) => family.family));
  const setSelected = (next: Set<string>) => change({ providers: undefined, families: next.size === families.length ? undefined : [...next] });
  const toggle = (ids: string[], on: boolean) => {
    const next = new Set(selected);
    for (const entry of ids) if (on) next.add(entry); else next.delete(entry);
    setSelected(next);
  };
  const versions = new Set(filters.versions ?? VERSIONS);
  const active = (selected.size < families.length ? 1 : 0) + (filters.versions ? 1 : 0) + (filters.reasoning !== undefined ? 1 : 0) + (filters.openWeights !== undefined ? 1 : 0);
  const match = (family: FamilySource) => `${family.familyDisplayName} ${family.provider} ${PROVIDERS[family.provider]?.name ?? ""}`.toLowerCase().includes(query.toLowerCase());

  return <Popover>
    <PopoverTrigger render={<Button variant="outline" />}>
      Models <Badge variant="secondary">{selected.size}/{families.length}</Badge>
      {active > 0 && <Badge>{active}<span className="sr-only"> active filters</span></Badge>}
      <CaretDown size={13} />
    </PopoverTrigger>
    <PopoverContent side="bottom" align="start">
      <div className="flex max-h-[min(34rem,80vh)] w-full flex-col gap-3 text-sm">
        <div>
          <Label htmlFor={`${id}-search`} className="sr-only">Search models or providers</Label>
          <Input id={`${id}-search`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search models or providers" />
          <div className="mt-2 flex gap-3"><Button variant="link" onClick={() => setSelected(new Set(families.map((family) => family.family)))}>Select all</Button><Button variant="link" onClick={() => setSelected(new Set())}>Clear</Button></div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto border-y border-border py-2">
          {providers.map((provider) => {
            const group = families.filter((family) => family.provider === provider);
            const shown = group.filter(match);
            if (!shown.length) return null;
            const all = group.every((family) => selected.has(family.family));
            return <div key={provider} className="py-2">
              <Label className="min-h-11"><Checkbox checked={all} onCheckedChange={(checked) => toggle(group.map((family) => family.family), checked)} /><ProviderLogo provider={provider} size={13} />{PROVIDERS[provider]?.name ?? provider}</Label>
              {shown.map((family) => <Label key={family.family} className="min-h-11 pl-6"><Checkbox checked={selected.has(family.family)} onCheckedChange={(checked) => toggle([family.family], checked)} />{family.familyDisplayName}</Label>)}
            </div>;
          })}
        </div>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3"><span>Version</span><div className="flex gap-2">{VERSIONS.map((version) => <Toggle key={version} variant="outline" pressed={versions.has(version)} onPressedChange={(pressed) => {
            const next = new Set(versions);
            if (pressed) next.add(version); else next.delete(version);
            change({ versions: next.size === VERSIONS.length ? undefined : [...next] });
          }}>v{version}</Toggle>)}</div></div>
          <div className="flex flex-wrap items-center justify-between gap-3"><span>Reasoning</span><Segmented label="Reasoning" value={filters.reasoning === undefined ? "any" : filters.reasoning ? "on" : "off"} onChange={(value) => change({ reasoning: value === "any" ? undefined : value === "on" })} options={[{ value: "any", label: "Any" }, { value: "on", label: "On" }, { value: "off", label: "Off" }]} /></div>
          <div className="flex flex-wrap items-center justify-between gap-3"><span>Weights</span><Segmented label="Weights" value={filters.openWeights === undefined ? "any" : filters.openWeights ? "open" : "closed"} onChange={(value) => change({ openWeights: value === "any" ? undefined : value === "open" })} options={[{ value: "any", label: "Any" }, { value: "open", label: "Open" }, { value: "closed", label: "Closed" }]} /></div>
          <Button variant="link" onClick={() => change({ providers: undefined, families: undefined, versions: undefined, reasoning: undefined, openWeights: undefined })}>Reset model filters</Button>
        </div>
      </div>
    </PopoverContent>
  </Popover>;
}
