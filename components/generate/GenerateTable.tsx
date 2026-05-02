"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import type { Compound } from "@/lib/supabase/types";
import { buildFuse, bestMatch } from "@/lib/fuzzyMatch";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CompoundSearchCell } from "@/components/generate/CompoundSearchCell";
import { ExportButton } from "@/components/generate/ExportButton";
import { toast } from "sonner";
import { ArrowRightLeft, Eraser, Loader2, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ResultRow = {
  cn: number;
  rt: string;
  compound: string;
  ric: string;
  rir: number | "#N/D" | "";
  percent: string;
  sd: string;
  type: string;
  cf: string;
  mm_da: number | "#N/D" | "";
  originalInput: string;
  matchedFromDB: boolean;
};

function rowFromCompound(
  cn: number,
  originalInput: string,
  match: Compound | null,
): ResultRow {
  if (!match) {
    return {
      cn,
      rt: "",
      compound: "#N/D",
      ric: "",
      rir: "#N/D",
      percent: "",
      sd: "",
      type: "#N/D",
      cf: "#N/D",
      mm_da: "#N/D",
      originalInput,
      matchedFromDB: false,
    };
  }
  return {
    cn,
    rt: "",
    compound: match.compound,
    ric: "",
    rir: match.rir,
    percent: "",
    sd: "",
    type: match.type,
    cf: match.cf,
    mm_da: Number(match.mm_da),
    originalInput,
    matchedFromDB: true,
  };
}

export function GenerateTable() {
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const [compounds, setCompounds] = useState<Compound[]>([]);
  const [loadingDB, setLoadingDB] = useState(true);
  const [pasted, setPasted] = useState("");
  const [results, setResults] = useState<ResultRow[]>([]);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    (async () => {
      setLoadingDB(true);
      const { data, error } = await supabase
        .from("compounds")
        .select("*")
        .order("compound", { ascending: true });
      setLoadingDB(false);
      if (error) {
        toast.error("Error cargando base de compuestos");
        return;
      }
      setCompounds(data ?? []);
    })();
  }, [supabase]);

  const fuse = useMemo(() => buildFuse(compounds), [compounds]);

  function handleProcess() {
    const lines = pasted
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      toast.error("Pegá al menos un compuesto");
      return;
    }
    setProcessing(true);
    const next: ResultRow[] = lines.map((name, idx) => {
      const match = bestMatch(fuse, name, 0.5);
      return rowFromCompound(idx + 1, name, match);
    });
    setResults(next);
    setProcessing(false);
    const matched = next.filter((r) => r.matchedFromDB).length;
    toast.success(`Procesados ${next.length} · ${matched} identificados`);
  }

  function clearAll() {
    setResults([]);
    setPasted("");
  }

  function updateRow(index: number, patch: Partial<ResultRow>) {
    setResults((prev) =>
      prev.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    );
  }

  function applyMatch(index: number, match: Compound) {
    setResults((prev) =>
      prev.map((r, i) =>
        i === index
          ? {
              ...r,
              compound: match.compound,
              rir: match.rir,
              type: match.type,
              cf: match.cf,
              mm_da: Number(match.mm_da),
              matchedFromDB: true,
            }
          : r,
      ),
    );
  }

  const summaries = useMemo(() => computeSummaries(results), [results]);

  return (
    <div className="space-y-6">
      {/* Step 1: Paste */}
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-primary/10 text-primary text-sm font-semibold">
            1
          </span>
          <h2 className="font-semibold">Pegá la lista de compuestos</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Un compuesto por línea. El sistema busca el mejor match difuso contra
          la base.
        </p>
        <textarea
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          rows={8}
          placeholder={"Ethyl acetate\nHexane\nLimonene\nCaryophyllene <E->\n..."}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            onClick={handleProcess}
            disabled={loadingDB || processing || !pasted.trim()}
          >
            {processing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4" />
            )}
            Procesar Lista
          </Button>
          {results.length > 0 && (
            <Button variant="outline" onClick={clearAll}>
              <Eraser className="h-4 w-4" /> Limpiar
            </Button>
          )}
          {loadingDB && (
            <span className="text-xs text-muted-foreground self-center">
              Cargando base de datos…
            </span>
          )}
        </div>
      </div>

      {/* Step 2: Results table */}
      {results.length > 0 && (
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b bg-slate-50/70 px-5 py-3">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-md bg-primary/10 text-primary text-sm font-semibold">
                2
              </span>
              <h2 className="font-semibold">Resultados</h2>
              <span className="text-xs text-muted-foreground ml-2">
                {results.filter((r) => r.matchedFromDB).length} de{" "}
                {results.length} identificados
              </span>
            </div>
            <ExportButton rows={results} />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2.5 min-w-[180px]">Original Name</th>
                  <th className="px-3 py-2.5 w-14">CN</th>
                  <th className="px-3 py-2.5 w-20">RT</th>
                  <th className="px-3 py-2.5 min-w-[220px]">Compound</th>
                  <th className="px-3 py-2.5 w-24">RIC</th>
                  <th className="px-3 py-2.5 w-24">RIR</th>
                  <th className="px-3 py-2.5 w-20">%</th>
                  <th className="px-3 py-2.5 w-20">SD</th>
                  <th className="px-3 py-2.5 w-20">Type</th>
                  <th className="px-3 py-2.5 w-28">CF</th>
                  <th className="px-3 py-2.5 w-24">MM (Da)</th>
                  <th className="px-3 py-2.5 w-20">Val1</th>
                  <th className="px-3 py-2.5 w-20">Val2</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {results.map((row, idx) => {
                  const next = results[idx + 1];
                  const val2 = computeVal2(row, next);
                  const val1 = computeVal1(row);
                  return (
                    <tr
                      key={idx}
                      className={cn(
                        "transition-colors",
                        !row.matchedFromDB && "bg-amber-50/40",
                      )}
                    >
                      <td
                        className="px-3 py-2 text-xs text-muted-foreground italic truncate max-w-[220px]"
                        title={row.originalInput}
                      >
                        {row.originalInput}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground tabular-nums">
                        {row.cn}
                      </td>
                      <td className="px-2 py-1.5">
                        <CellInput
                          value={row.rt}
                          onChange={(v) => updateRow(idx, { rt: v })}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <CompoundSearchCell
                          value={row.compound}
                          fuse={fuse}
                          unmatched={!row.matchedFromDB}
                          onText={(text) =>
                            updateRow(idx, {
                              compound: text,
                              matchedFromDB: false,
                            })
                          }
                          onSelect={(c) => applyMatch(idx, c)}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <CellInput
                          value={row.ric}
                          onChange={(v) => updateRow(idx, { ric: v })}
                          placeholder=""
                        />
                      </td>
                      <td className="px-2 py-1.5 tabular-nums">
                        <CellInput
                          value={row.rir === "#N/D" ? "#N/D" : String(row.rir)}
                          onChange={(v) =>
                            updateRow(idx, {
                              rir:
                                v === "#N/D" || v === ""
                                  ? (v as "#N/D" | "")
                                  : Number(v),
                            })
                          }
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <CellInput
                          value={row.percent}
                          onChange={(v) => updateRow(idx, { percent: v })}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <CellInput
                          value={row.sd}
                          onChange={(v) => updateRow(idx, { sd: v })}
                        />
                      </td>
                      <td className="px-2 py-1.5 font-mono text-xs">
                        <CellInput
                          value={row.type}
                          onChange={(v) => updateRow(idx, { type: v })}
                        />
                      </td>
                      <td className="px-2 py-1.5 font-mono text-xs">
                        <CellInput
                          value={row.cf}
                          onChange={(v) => updateRow(idx, { cf: v })}
                        />
                      </td>
                      <td className="px-2 py-1.5 tabular-nums">
                        <CellInput
                          value={
                            row.mm_da === "#N/D" || row.mm_da === ""
                              ? String(row.mm_da)
                              : String(row.mm_da)
                          }
                          onChange={(v) =>
                            updateRow(idx, {
                              mm_da:
                                v === "#N/D" || v === ""
                                  ? (v as "#N/D" | "")
                                  : Number(v),
                            })
                          }
                        />
                      </td>
                      <td
                        className={cn(
                          "px-3 py-2 tabular-nums text-xs",
                          val1 !== null && val1 < 0 && "bg-destructive/15 text-destructive font-medium",
                        )}
                      >
                        {val1 === null ? "" : val1}
                      </td>
                      <td
                        className={cn(
                          "px-3 py-2 tabular-nums text-xs",
                          val2 !== null && val2 < 0 && "bg-destructive/15 text-destructive font-medium",
                        )}
                      >
                        {val2 === null ? "" : val2}
                      </td>
                    </tr>
                  );
                })}
                {summaries.length > 0 && (
                  <>
                    <tr aria-hidden="true">
                      <td colSpan={13} className="py-2 bg-slate-50/40"></td>
                    </tr>
                    {summaries.map((s, i) => (
                      <tr
                        key={`sum-${i}`}
                        className="bg-slate-50 font-medium"
                      >
                        <td className="px-3 py-2"></td>
                        <td className="px-3 py-2"></td>
                        <td className="px-3 py-2"></td>
                        <td className="px-3 py-2 text-slate-800">
                          {s.label}
                        </td>
                        <td className="px-3 py-2"></td>
                        <td className="px-3 py-2"></td>
                        <td className="px-3 py-2 tabular-nums text-slate-800">
                          {s.sum.toFixed(2)}
                        </td>
                        <td className="px-3 py-2"></td>
                        <td className="px-3 py-2"></td>
                        <td className="px-3 py-2"></td>
                        <td className="px-3 py-2"></td>
                        <td className="px-3 py-2"></td>
                        <td className="px-3 py-2"></td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {loadingDB && results.length === 0 && (
        <div className="rounded-xl border bg-white p-6 shadow-sm space-y-3">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-32 w-full" />
        </div>
      )}
    </div>
  );
}

export const SUMMARY_CATEGORIES: ReadonlyArray<{ code: string; label: string }> = [
  { code: "MH", label: "Monoterpene hydrocarbons (MH)" },
  { code: "OM", label: "Oxygenated monoterpenes (OM)" },
  { code: "SH", label: "Sesquiterpene hydrocarbons (SH)" },
  { code: "OS", label: "Oxygenated sesquiterpene (OS)" },
  { code: "OC", label: "Other compounds (OC)" },
];

export type SummaryEntry = { label: string; sum: number };

export function computeSummaries(rows: ResultRow[]): SummaryEntry[] {
  const out: SummaryEntry[] = [];

  for (const cat of SUMMARY_CATEGORIES) {
    let sum = 0;
    let hasRows = false;
    for (const row of rows) {
      if (row.type !== cat.code) continue;
      const p = parseFloat(row.percent);
      if (!Number.isFinite(p)) continue;
      sum += p;
      hasRows = true;
    }
    if (hasRows) {
      out.push({ label: cat.label, sum: Math.round(sum * 100) / 100 });
    }
  }

  let total = 0;
  let hasAny = false;
  for (const row of rows) {
    const p = parseFloat(row.percent);
    if (!Number.isFinite(p)) continue;
    total += p;
    hasAny = true;
  }
  if (hasAny) {
    out.push({ label: "Total identified", sum: Math.round(total * 100) / 100 });
  }

  return out;
}

function computeVal1(row: ResultRow): number | null {
  const ric = parseFloat(row.ric);
  const rir = typeof row.rir === "number" ? row.rir : NaN;
  if (Number.isNaN(ric) || Number.isNaN(rir)) return null;
  return Math.round((ric - rir) * 100) / 100;
}

function computeVal2(row: ResultRow, next: ResultRow | undefined): number | null {
  if (!next) return null;
  const a = typeof row.rir === "number" ? row.rir : NaN;
  const b = typeof next.rir === "number" ? next.rir : NaN;
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return b - a;
}

function CellInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      className="cell-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}
