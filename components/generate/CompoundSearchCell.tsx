"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type Fuse from "fuse.js";
import type { Compound } from "@/lib/supabase/types";
import { topMatches } from "@/lib/fuzzyMatch";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

type CompoundWithNorm = Compound & { _normalized: string };

export function CompoundSearchCell({
  value,
  fuse,
  unmatched,
  onText,
  onSelect,
}: {
  value: string;
  fuse: Fuse<CompoundWithNorm>;
  unmatched: boolean;
  onText: (text: string) => void;
  onSelect: (c: Compound) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const ref = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  const suggestions = useMemo(() => {
    if (!editing || !draft.trim()) return [];
    return topMatches(fuse, draft.trim(), 5);
  }, [draft, editing, fuse]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setEditing(false);
        setOpen(false);
        if (draft !== value) onText(draft);
      }
    }
    if (editing) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [editing, draft, value, onText]);

  function commit() {
    setEditing(false);
    setOpen(false);
    if (draft !== value) onText(draft);
  }

  function chooseSuggestion(c: Compound) {
    setEditing(false);
    setOpen(false);
    setDraft(c.compound);
    onSelect(c);
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setEditing(true);
          setOpen(true);
          setHighlight(0);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className={cn(
          "w-full text-left px-2 py-1 rounded transition hover:bg-accent/40 flex items-center gap-2",
          unmatched && "text-amber-700",
        )}
      >
        {unmatched && <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
        <span className="truncate">{value || <em className="text-muted-foreground">—</em>}</span>
      </button>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <input
        ref={inputRef}
        className="cell-input"
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          setOpen(true);
          setHighlight(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((h) => Math.min(suggestions.length - 1, h + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => Math.max(0, h - 1));
          } else if (e.key === "Enter") {
            e.preventDefault();
            const pick = suggestions[highlight];
            if (pick) chooseSuggestion(pick);
            else commit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            setEditing(false);
            setOpen(false);
            setDraft(value);
          }
        }}
      />
      {open && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-auto rounded-md border bg-popover shadow-lg animate-fade-in">
          {suggestions.map((s, i) => (
            <button
              type="button"
              key={s.id}
              onMouseDown={(e) => {
                e.preventDefault();
                chooseSuggestion(s);
              }}
              onMouseEnter={() => setHighlight(i)}
              className={cn(
                "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm border-b last:border-0",
                highlight === i ? "bg-accent" : "hover:bg-accent/60",
              )}
            >
              <div className="min-w-0">
                <div className="truncate font-medium">{s.compound}</div>
                <div className="text-xs text-muted-foreground font-mono">
                  CN #{s.id} · {s.cf} · RIR {s.rir}
                </div>
              </div>
              <span className="shrink-0 rounded bg-slate-100 px-2 py-0.5 text-[11px] font-mono">
                {s.type}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
