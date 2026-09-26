"use client";

// Shared filter controls for the leaderboard and the puzzle explorer: one
// Models popover (families scroll, version/reasoning/weights pinned below)
// and Best/All effort.

import { CaretDown, MagnifyingGlass } from "@phosphor-icons/react";
import { useState } from "react";
import { ProviderLogo } from "@/components/provider-logos/provider-logo";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { effortLabel } from "@/lib/display";
import { VERSIONS, type Filters } from "@/lib/leaderboard";
import { PROVIDERS } from "@/lib/providers";

type FamilySource = { family: string; familyDisplayName: string; provider: string };

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-bright";
export const filterPill = `inline-flex min-h-9 items-center gap-2 rounded-full border border-border bg-foreground/5 px-3 text-sm text-foreground hover:bg-foreground/10 ${focus}`;

export function Segmented<T extends string>({ value, options, onChange, label, size = "md" }: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
  size?: "sm" | "md";
}) {
  // Radio-group keyboard behaviour: one tab stop, arrows move the selection.
  const move = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const index = options.findIndex((option) => option.value === value);
    const next = options[(index + step + options.length) % options.length];
    onChange(next.value);
    const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>("[role=radio]");
    buttons[options.indexOf(next)]?.focus();
  };
  const selected = options.some((option) => option.value === value);
  return (
    <div role="radiogroup" aria-label={label} onKeyDown={move} className="inline-flex rounded-full border border-border bg-foreground/5 p-0.5">
      {options.map((option, index) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          tabIndex={value === option.value || (!selected && index === 0) ? 0 : -1}
          onClick={() => onChange(option.value)}
          className={`rounded-full ${size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm"} ${focus} ${value === option.value ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function EffortToggle({ filters, change }: { filters: Filters; change: (patch: Partial<Filters>) => void }) {
  const effort = filters.effort ?? "best";
  // Older links can pin one level (?e=low); show it as the active option.
  const pinned = effort !== "best" && effort !== "all" ? effort : null;
  return (
    <Segmented
      label="Effort levels"
      value={effort}
      onChange={(value) => change({ effort: value })}
      options={[
        { value: "best", label: "Best" },
        { value: "all", label: "All effort levels" },
        ...(pinned ? [{ value: pinned, label: `${effortLabel(pinned)} only` }] : []),
      ]}
    />
  );
}

export function ModelsPopover({ filters, change, sources }: {
  filters: Filters;
  change: (patch: Partial<Filters>) => void;
  sources: FamilySource[];
}) {
  const [query, setQuery] = useState("");
  const families = [...new Map(sources.map((source) => [source.family, source])).values()];
  const providers = [...new Set(families.map((family) => family.provider))];
  // A provider filter (from a shared link) selects that provider's families.
  const selected = new Set(
    families
      .filter((family) =>
        (!filters.families || filters.families.includes(family.family)) &&
        (!filters.providers || filters.providers.includes(family.provider)))
      .map((family) => family.family),
  );
  const setSelected = (next: Set<string>) =>
    change({ providers: undefined, families: next.size === families.length ? undefined : [...next] });
  const toggle = (ids: string[], on: boolean) => {
    const next = new Set(selected);
    for (const id of ids) if (on) next.add(id); else next.delete(id);
    setSelected(next);
  };
  const versions = new Set(filters.versions ?? VERSIONS);
  const active =
    (selected.size < families.length ? 1 : 0) +
    (filters.versions ? 1 : 0) +
    (filters.reasoning !== undefined ? 1 : 0) +
    (filters.openWeights !== undefined ? 1 : 0);
  const match = (family: FamilySource) =>
    `${family.familyDisplayName} ${family.provider} ${PROVIDERS[family.provider]?.name ?? ""}`.toLowerCase().includes(query.toLowerCase());

  return (
    <Popover>
      <PopoverTrigger type="button" className={filterPill}>
        Models
        <span className="font-mono text-xs text-muted-foreground">{selected.size}/{families.length}</span>
        {active > 0 && (
          <span className="rounded-full bg-ember px-1.5 font-mono text-[10px] text-background">
            {active}<span className="sr-only"> active filters</span>
          </span>
        )}
        <CaretDown size={13} />
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" collisionAvoidance={{ side: "none" }} className="w-auto max-w-none p-0">
        <div className="flex max-h-[min(34rem,max(18rem,calc(var(--available-height,80vh)-0.5rem)))] w-[min(24rem,calc(100vw-2rem))] flex-col text-sm text-foreground">
          <div className="border-b border-border p-3">
            <label className="flex items-center gap-2 rounded-md border border-border bg-background px-2.5 focus-within:border-ember">
              <MagnifyingGlass size={14} className="text-muted-foreground" aria-hidden="true" />
              <span className="sr-only">Search models or providers</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search models or providers" className="w-full bg-transparent py-2 text-sm outline-none" />
            </label>
            <div className="mt-2 flex gap-3 text-xs">
              <button type="button" className="text-ember hover:underline" onClick={() => setSelected(new Set(families.map((family) => family.family)))}>Select all</button>
              <button type="button" className="text-ember hover:underline" onClick={() => setSelected(new Set())}>Clear</button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {providers.map((provider) => {
              const group = families.filter((family) => family.provider === provider);
              const shown = group.filter(match);
              if (!shown.length) return null;
              const all = group.every((family) => selected.has(family.family));
              return (
                <div key={provider} className="py-1">
                  <label className="flex items-center gap-2 px-1 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <input type="checkbox" checked={all} onChange={() => toggle(group.map((family) => family.family), !all)} />
                    <ProviderLogo provider={provider} size={13} />
                    {PROVIDERS[provider]?.name ?? provider}
                  </label>
                  {shown.map((family) => (
                    <label key={family.family} className="flex items-center gap-2 rounded px-1 py-1 pl-6 hover:bg-foreground/5">
                      <input type="checkbox" checked={selected.has(family.family)} onChange={() => toggle([family.family], !selected.has(family.family))} />
                      {family.familyDisplayName}
                    </label>
                  ))}
                </div>
              );
            })}
          </div>
          <div className="space-y-3 border-t border-border bg-foreground/[0.03] p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Version</span>
              <div className="flex gap-1">
                {VERSIONS.map((version) => {
                  const on = versions.has(version);
                  return (
                    <button
                      key={version}
                      type="button"
                      aria-pressed={on}
                      onClick={() => {
                        const next = new Set(versions);
                        if (on) next.delete(version); else next.add(version);
                        change({ versions: next.size === VERSIONS.length ? undefined : [...next] });
                      }}
                      className={`rounded-full border px-2.5 py-0.5 font-mono text-xs ${focus} ${on ? "border-ember/60 bg-ember/15 text-foreground" : "border-border text-muted-foreground"}`}
                    >
                      v{version}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Reasoning</span>
              <Segmented
                size="sm"
                label="Reasoning"
                value={filters.reasoning === undefined ? "any" : filters.reasoning ? "on" : "off"}
                onChange={(value) => change({ reasoning: value === "any" ? undefined : value === "on" })}
                options={[{ value: "any", label: "Any" }, { value: "on", label: "On" }, { value: "off", label: "Off" }]}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Weights</span>
              <Segmented
                size="sm"
                label="Weights"
                value={filters.openWeights === undefined ? "any" : filters.openWeights ? "open" : "closed"}
                onChange={(value) => change({ openWeights: value === "any" ? undefined : value === "open" })}
                options={[{ value: "any", label: "Any" }, { value: "open", label: "Open" }, { value: "closed", label: "Closed" }]}
              />
            </div>
            <button
              type="button"
              className="text-xs text-ember hover:underline"
              onClick={() => change({ providers: undefined, families: undefined, versions: undefined, reasoning: undefined, openWeights: undefined })}
            >
              Reset model filters
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
