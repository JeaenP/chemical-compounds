"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";
import type { Compound, Json } from "@/lib/supabase/types";
import { buildFuse, bestMatch } from "@/lib/fuzzyMatch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CompoundSearchCell } from "@/components/generate/CompoundSearchCell";
import { ExportButton } from "@/components/generate/ExportButton";
import { toast } from "sonner";
import {
  Eraser,
  Loader2,
  Save,
  Wand2,
  PencilLine,
  MoreVertical,
  ArrowUp,
  ArrowDown,
  Trash2,
} from "lucide-react";
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

export function GenerateTable({
  initialTableId,
}: {
  initialTableId?: string;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const [compounds, setCompounds] = useState<Compound[]>([]);
  const [loadingDB, setLoadingDB] = useState(true);
  const [pasted, setPasted] = useState("");
  const [results, setResults] = useState<ResultRow[]>([]);
  const [processing, setProcessing] = useState(false);

  // Save / load
  const [currentTableId, setCurrentTableId] = useState<string | null>(
    initialTableId ?? null,
  );
  const [currentTableName, setCurrentTableName] = useState<string | null>(null);
  const [loadingFromHistory, setLoadingFromHistory] = useState(
    !!initialTableId,
  );
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saving, setSaving] = useState(false);

  // Row-options menu (open at most one at a time)
  const [openMenuIdx, setOpenMenuIdx] = useState<number | null>(null);

  useEffect(() => {
    if (openMenuIdx === null) return;
    function onDocClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (!target?.closest("[data-row-menu]")) {
        setOpenMenuIdx(null);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [openMenuIdx]);

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

  // Load saved table if initialTableId is present
  useEffect(() => {
    if (!initialTableId) return;
    (async () => {
      setLoadingFromHistory(true);
      const { data, error } = await supabase
        .from("generated_tables")
        .select("*")
        .eq("id", initialTableId)
        .single();
      setLoadingFromHistory(false);
      if (error || !data) {
        toast.error("No se pudo cargar la tabla guardada");
        setCurrentTableId(null);
        setCurrentTableName(null);
        router.replace("/dashboard/generate");
        return;
      }
      setResults((data.rows as unknown as ResultRow[]) ?? []);
      setCurrentTableId(data.id);
      setCurrentTableName(data.name);
    })();
  }, [initialTableId, supabase, router]);

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
    // Processing a new list starts a fresh save context
    if (currentTableId) {
      setCurrentTableId(null);
      setCurrentTableName(null);
      router.replace("/dashboard/generate");
    }
    setProcessing(false);
    const matched = next.filter((r) => r.matchedFromDB).length;
    toast.success(`Procesados ${next.length} · ${matched} identificados`);
  }

  function clearAll() {
    setResults([]);
    setPasted("");
    setCurrentTableId(null);
    setCurrentTableName(null);
    if (initialTableId) {
      router.replace("/dashboard/generate");
    }
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

  function emptyRow(cn: number): ResultRow {
    return {
      cn,
      rt: "",
      compound: "",
      ric: "",
      rir: "",
      percent: "",
      sd: "",
      type: "",
      cf: "",
      mm_da: "",
      originalInput: "",
      matchedFromDB: false,
    };
  }

  function renumber(rows: ResultRow[]): ResultRow[] {
    return rows.map((r, i) => ({ ...r, cn: i + 1 }));
  }

  function insertRow(at: number) {
    setResults((prev) => {
      const next = [...prev];
      next.splice(at, 0, emptyRow(0));
      return renumber(next);
    });
    setOpenMenuIdx(null);
  }

  function deleteRow(at: number) {
    setResults((prev) => renumber(prev.filter((_, i) => i !== at)));
    setOpenMenuIdx(null);
  }

  // Editing Original Name re-runs the fuzzy match, mirroring how the initial
  // paste flow assigns rows. If matched, fills the DB-derived fields; if not,
  // clears them so user knows nothing is associated. RT/RIC/%/SD stay intact.
  function changeOriginalName(idx: number, text: string) {
    const trimmed = text.trim();
    const match = trimmed ? bestMatch(fuse, trimmed, 0.5) : null;
    setResults((prev) =>
      prev.map((r, i) => {
        if (i !== idx) return r;
        if (match) {
          return {
            ...r,
            originalInput: text,
            compound: match.compound,
            rir: match.rir,
            type: match.type,
            cf: match.cf,
            mm_da: Number(match.mm_da),
            matchedFromDB: true,
          };
        }
        return {
          ...r,
          originalInput: text,
          compound: "",
          rir: "",
          type: "",
          cf: "",
          mm_da: "",
          matchedFromDB: false,
        };
      }),
    );
  }

  // Excel-style paste handler for RIC, %, SD columns.
  function handlePaste(
    rowIdx: number,
    column: "ric" | "percent" | "sd",
    e: React.ClipboardEvent<HTMLInputElement>,
  ) {
    const text = e.clipboardData.getData("text");
    if (!text) return;
    // Single-value paste (no newlines): default browser behaviour.
    if (!/\r|\n/.test(text)) return;
    e.preventDefault();
    const values = text.split(/\r?\n/).map((v) => v.trim());
    setResults((prev) => {
      const next = [...prev];
      for (let i = 0; i < values.length; i++) {
        const targetIdx = rowIdx + i;
        if (targetIdx >= next.length) break;
        const v = values[i];
        if (v === "") continue; // empty → leave unchanged
        if (column === "percent" || column === "sd") {
          if (!Number.isFinite(parseFloat(v))) continue;
        }
        next[targetIdx] = { ...next[targetIdx], [column]: v };
      }
      return next;
    });
  }

  async function handleSaveClick() {
    if (results.length === 0) {
      toast.error("No hay datos para guardar");
      return;
    }
    if (currentTableId) {
      // Update existing record
      setSaving(true);
      const { error } = await supabase
        .from("generated_tables")
        .update({
          rows: results as unknown as Json,
          updated_at: new Date().toISOString(),
        })
        .eq("id", currentTableId);
      setSaving(false);
      if (error) {
        toast.error("Error al guardar cambios");
        return;
      }
      toast.success("Tabla guardada correctamente");
      return;
    }
    // New table → ask for name
    setSaveName("");
    setSaveDialogOpen(true);
  }

  async function confirmSaveNew() {
    const name = saveName.trim();
    if (!name) {
      toast.error("Ingresá un nombre para la tabla");
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from("generated_tables")
      .insert({ name, rows: results as unknown as Json })
      .select()
      .single();
    setSaving(false);
    if (error || !data) {
      toast.error("Error al guardar la tabla");
      return;
    }
    setCurrentTableId(data.id);
    setCurrentTableName(data.name);
    setSaveDialogOpen(false);
    setSaveName("");
    toast.success("Tabla guardada correctamente");
  }

  const summaries = useMemo(() => computeSummaries(results), [results]);
  const isEditing = !!currentTableId;

  if (loadingFromHistory) {
    return (
      <div className="rounded-xl border bg-white p-6 shadow-sm space-y-3">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isEditing && currentTableName && (
        <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
          <PencilLine className="h-4 w-4 text-primary shrink-0" />
          <span className="text-muted-foreground">Editando:</span>
          <span className="font-semibold truncate">{currentTableName}</span>
        </div>
      )}

      {/* Step 1: Paste */}
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-primary/10 text-primary text-sm font-semibold">
            1
          </span>
          <h2 className="font-semibold">
            {isEditing ? "Procesar nueva lista" : "Pegá la lista de compuestos"}
          </h2>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          {isEditing
            ? "Procesar una nueva lista reemplaza los datos actuales y crea una tabla nueva al guardar."
            : "Un compuesto por línea. El sistema busca el mejor match difuso contra la base."}
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
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                onClick={handleSaveClick}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {isEditing ? "Guardar cambios" : "Guardar tabla"}
              </Button>
              <ExportButton rows={results} />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="px-1 py-2.5 w-8" aria-label="Acciones"></th>
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
                        "group transition-colors",
                        !row.matchedFromDB && "bg-amber-50/40",
                      )}
                    >
                      <td
                        className="px-1 py-1 align-middle relative w-8"
                        data-row-menu
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setOpenMenuIdx(openMenuIdx === idx ? null : idx)
                          }
                          aria-label="Opciones de fila"
                          className={cn(
                            "grid h-6 w-6 place-items-center rounded text-muted-foreground transition hover:bg-accent hover:text-foreground focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            openMenuIdx === idx
                              ? "opacity-100"
                              : "opacity-0 group-hover:opacity-100",
                          )}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        {openMenuIdx === idx && (
                          <div className="absolute left-1 top-8 z-30 min-w-[180px] rounded-md border bg-popover py-1 text-sm shadow-lg animate-fade-in">
                            <button
                              type="button"
                              onClick={() => insertRow(idx)}
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-accent"
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                              Insertar fila arriba
                            </button>
                            <button
                              type="button"
                              onClick={() => insertRow(idx + 1)}
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-accent"
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                              Insertar fila abajo
                            </button>
                            <div className="my-1 h-px bg-border" />
                            <button
                              type="button"
                              onClick={() => deleteRow(idx)}
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Eliminar fila
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-1.5 max-w-[220px]">
                        <OriginalNameInput
                          value={row.originalInput}
                          onCommit={(text) => changeOriginalName(idx, text)}
                        />
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
                          onPaste={(e) => handlePaste(idx, "ric", e)}
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
                          onPaste={(e) => handlePaste(idx, "percent", e)}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <CellInput
                          value={row.sd}
                          onChange={(v) => updateRow(idx, { sd: v })}
                          onPaste={(e) => handlePaste(idx, "sd", e)}
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
                          val1 !== null && Math.abs(val1) > 10 && "bg-destructive/15 text-destructive font-medium",
                          val1 !== null && Math.abs(val1) > 5 && Math.abs(val1) <= 10 && "bg-yellow-100 text-yellow-800 font-medium",
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
                      <td colSpan={14} className="py-2 bg-slate-50/40"></td>
                    </tr>
                    {summaries.map((s, i) => (
                      <tr
                        key={`sum-${i}`}
                        className="bg-slate-50 font-medium"
                      >
                        <td className="px-1 py-2"></td>
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

      {/* Save dialog (only for brand-new tables) */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Guardar tabla</DialogTitle>
            <DialogDescription>
              Asigná un nombre a esta tabla (por ejemplo, el nombre del
              artículo o muestra).
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") confirmSaveNew();
            }}
            placeholder="Ej: Aceite esencial de orégano - run 1"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSaveDialogOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={confirmSaveNew} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const SUMMARY_CATEGORIES: ReadonlyArray<{ code: string; label: string }> = [
  { code: "MH", label: "Monoterpene hydrocarbons (MH)" },
  { code: "OM", label: "Oxygenated monoterpenes (OM)" },
  { code: "SH", label: "Sesquiterpene hydrocarbons (SH)" },
  { code: "OS", label: "Oxygenated sesquiterpene (OS)" },
  { code: "OC", label: "Other compounds (OC)" },
  { code: "EH", label: "Sesterterpene hydrocarbons (EH)" },
  { code: "OE", label: "Oxygenated sesterterpenes (OE)" },
  { code: "TH", label: "Triterpene hydrocarbons (TH)" },
  { code: "OT", label: "Oxygenated triterpenes (OT)" },
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
  onPaste,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  onPaste?: (e: React.ClipboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <input
      className="cell-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onPaste={onPaste}
      placeholder={placeholder}
    />
  );
}

// Original Name input: edits with a draft buffer and only triggers fuzzy
// re-match on blur or Enter — avoids re-running the matcher on every keystroke.
function OriginalNameInput({
  value,
  onCommit,
}: {
  value: string;
  onCommit: (text: string) => void;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  function commit() {
    if (draft !== value) onCommit(draft);
  }

  return (
    <input
      className="cell-input italic text-xs text-muted-foreground"
      value={draft}
      placeholder="Pegar nombre original…"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          (e.currentTarget as HTMLInputElement).blur();
        } else if (e.key === "Escape") {
          e.preventDefault();
          setDraft(value);
          (e.currentTarget as HTMLInputElement).blur();
        }
      }}
    />
  );
}
