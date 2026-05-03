"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { useConstants } from "@/lib/store";
import {
  parseCF,
  calculateType,
  calculateMM,
  validateCFField,
  validateNumericField,
  type AtomicConstants,
} from "@/lib/chemistry";
import type { Compound } from "@/lib/supabase/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Check,
  X,
  Pencil,
  Plus,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

type EditDraft = {
  compound: string;
  rir: string;
  cf: string;
  type: string;
  c_count: string;
  h_count: string;
  o_count: string;
  mm_da: string;
};

const PAGE_SIZE = 50;

function compoundToDraft(c: Compound): EditDraft {
  return {
    compound: c.compound,
    rir: String(c.rir),
    cf: c.cf,
    type: c.type,
    c_count: String(c.c_count),
    h_count: String(c.h_count),
    o_count: String(c.o_count),
    mm_da: String(c.mm_da),
  };
}

export function CompoundsTable() {
  const constants = useConstants();
  const supabase = useMemo(() => createBrowserSupabase(), []);

  const [rows, setRows] = useState<Compound[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Compound | null>(null);
  const [deleting, setDeleting] = useState(false);

  // New row state
  const [newDraft, setNewDraft] = useState({
    compound: "",
    rir: "",
    cf: "",
  });
  const [savingNew, setSavingNew] = useState(false);

  // TEMPORARY BUTTON - comment out after use
  // const [recalculating, setRecalculating] = useState(false);
  // const [recalcDone, setRecalcDone] = useState(0);
  // const [recalcTotal, setRecalcTotal] = useState(0);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch]);

  async function fetchAll() {
    setLoading(true);
    const { data, error } = await supabase
      .from("compounds")
      .select("*")
      .order("id", { ascending: true });
    setLoading(false);
    if (error) {
      toast.error("Error cargando compuestos");
      return;
    }
    setRows(data ?? []);
  }

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      if (String(r.id).includes(q)) return true;
      if (r.compound.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [rows, debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function startEdit(c: Compound) {
    setEditingId(c.id);
    setEditDraft(compoundToDraft(c));
  }
  function cancelEdit() {
    setEditingId(null);
    setEditDraft(null);
  }

  async function saveEdit() {
    if (!editingId || !editDraft) return;
    const compound = editDraft.compound.trim();
    const rir = parseInt(editDraft.rir, 10);
    const cf = editDraft.cf.trim();
    if (!compound || !cf || Number.isNaN(rir)) {
      toast.error("Compound, RIR y CF son requeridos");
      return;
    }
    const parsed = parseCF(cf);
    const mm = calculateMM(parsed, constants);
    setSavingId(editingId);
    const { data, error } = await supabase
      .from("compounds")
      .update({
        compound,
        rir,
        cf,
        c_count: parsed.c,
        h_count: parsed.h,
        o_count: parsed.o,
        mm_da: mm,
      })
      .eq("id", editingId)
      .select()
      .single();
    setSavingId(null);
    if (error || !data) {
      toast.error("Error al guardar");
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === data.id ? data : r)));
    toast.success(`Compuesto #${data.id} actualizado`);
    cancelEdit();
  }

  async function saveNew() {
    const compound = newDraft.compound.trim();
    const rir = parseInt(newDraft.rir, 10);
    const cf = newDraft.cf.trim();
    if (!compound || !cf || Number.isNaN(rir)) {
      toast.error("Completá Compound, RIR y CF");
      return;
    }
    const parsed = parseCF(cf);
    const mm = calculateMM(parsed, constants);
    setSavingNew(true);
    const { data, error } = await supabase
      .from("compounds")
      .insert({
        compound,
        rir,
        cf,
        c_count: parsed.c,
        h_count: parsed.h,
        o_count: parsed.o,
        mm_da: mm,
      })
      .select()
      .single();
    setSavingNew(false);
    if (error || !data) {
      toast.error("Error al insertar compuesto");
      return;
    }
    setRows((prev) => [...prev, data]);
    setNewDraft({ compound: "", rir: "", cf: "" });
    toast.success(`Compuesto #${data.id} agregado`);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase
      .from("compounds")
      .delete()
      .eq("id", deleteTarget.id);
    setDeleting(false);
    if (error) {
      toast.error("Error al eliminar");
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== deleteTarget.id));
    toast.success(`Compuesto #${deleteTarget.id} eliminado`);
    setDeleteTarget(null);
  }

  // TEMPORARY BUTTON - comment out after use
  /*
  async function recalculateAll() {
    if (recalculating) return;
    setRecalculating(true);
    setRecalcDone(0);
    setRecalcTotal(0);
    try {
      const { data: all, error } = await supabase
        .from("compounds")
        .select("*")
        .order("id", { ascending: true });
      if (error || !all) {
        toast.error("Error cargando compuestos");
        return;
      }
      setRecalcTotal(all.length);

      const BATCH = 50;
      let processed = 0;
      let failed = 0;

      for (let i = 0; i < all.length; i += BATCH) {
        const batch = all.slice(i, i + BATCH);
        const results = await Promise.all(
          batch.map(async (c) => {
            const parsed = parseCF(c.cf);
            const mm = calculateMM(parsed, constants);
            const { error: upErr } = await supabase
              .from("compounds")
              .update({
                c_count: parsed.c,
                h_count: parsed.h,
                o_count: parsed.o,
                mm_da: mm,
              })
              .eq("id", c.id);
            return !upErr;
          }),
        );
        processed += results.length;
        failed += results.filter((ok) => !ok).length;
        setRecalcDone(processed);
      }

      if (failed > 0) {
        toast.error(`Procesados ${processed}, ${failed} fallaron`);
      } else {
        toast.success("Todos los compuestos actualizados correctamente");
      }
      await fetchAll();
    } finally {
      setRecalculating(false);
    }
  }
  */

  // Live preview values for the new-row inputs
  const newPreview = useMemo(() => {
    if (!newDraft.cf.trim()) return null;
    const parsed = parseCF(newDraft.cf.trim());
    const mm = calculateMM(parsed, constants);
    return {
      type: calculateType(parsed.c, parsed.o),
      c: parsed.c,
      h: parsed.h,
      o: parsed.o,
      mm,
    };
  }, [newDraft.cf, constants]);

  const canSaveNew =
    !!newDraft.compound.trim() &&
    !!newDraft.cf.trim() &&
    !Number.isNaN(parseInt(newDraft.rir, 10));

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          Total de compuestos:{" "}
          <span className="font-semibold text-foreground">{rows.length}</span>
          {debouncedSearch && (
            <span className="ml-2">
              · Filtrados:{" "}
              <span className="font-semibold text-foreground">
                {filtered.length}
              </span>
            </span>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          {/* TEMPORARY BUTTON - comment out after use */}
          {/*
          <Button
            variant="outline"
            onClick={recalculateAll}
            disabled={recalculating || loading}
            className="border-amber-400 bg-amber-50 text-amber-800 hover:bg-amber-100 hover:text-amber-900 hover:border-amber-500 shrink-0"
          >
            {recalculating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Actualizando {recalcDone}/{recalcTotal}...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Recalcular todos los compuestos
              </>
            )}
          </Button>
          */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o CN…"
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-3 w-16">CN</th>
                <th className="px-3 py-3 min-w-[220px]">Compound</th>
                <th className="px-3 py-3 w-24">RIR</th>
                <th className="px-3 py-3 w-32">CF</th>
                <th className="px-3 py-3 w-20">Type</th>
                <th className="px-3 py-3 w-16">C</th>
                <th className="px-3 py-3 w-16">H</th>
                <th className="px-3 py-3 w-16">O</th>
                <th className="px-3 py-3 w-28">MM (Da)</th>
                <th className="px-3 py-3 w-24 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 10 }).map((__, j) => (
                      <td key={j} className="px-3 py-3">
                        <Skeleton className="h-5 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : pageRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-3 py-10 text-center text-muted-foreground text-sm"
                  >
                    {debouncedSearch
                      ? "No se encontraron resultados."
                      : "No hay compuestos cargados."}
                  </td>
                </tr>
              ) : (
                pageRows.map((row) => (
                  <CompoundRow
                    key={row.id}
                    row={row}
                    isEditing={editingId === row.id}
                    isSaving={savingId === row.id}
                    draft={editingId === row.id ? editDraft : null}
                    onStartEdit={() => startEdit(row)}
                    onCancel={cancelEdit}
                    onSave={saveEdit}
                    onChangeDraft={setEditDraft}
                    onDelete={() => setDeleteTarget(row)}
                    constants={constants}
                  />
                ))
              )}

              {/* New compound row */}
              <tr className="bg-blue-50/50 hover:bg-blue-50">
                <td className="px-3 py-2 text-muted-foreground italic">
                  nuevo
                </td>
                <td className="px-2 py-2">
                  <Input
                    value={newDraft.compound}
                    onChange={(e) =>
                      setNewDraft({ ...newDraft, compound: e.target.value })
                    }
                    placeholder="Nombre del compuesto"
                    className="h-9"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && canSaveNew) saveNew();
                    }}
                  />
                </td>
                <td className="px-2 py-2">
                  <Input
                    value={newDraft.rir}
                    onChange={(e) =>
                      setNewDraft({ ...newDraft, rir: e.target.value })
                    }
                    placeholder="RIR"
                    inputMode="numeric"
                    className="h-9"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && canSaveNew) saveNew();
                    }}
                  />
                </td>
                <td className="px-2 py-2">
                  <Input
                    value={newDraft.cf}
                    onChange={(e) =>
                      setNewDraft({ ...newDraft, cf: e.target.value })
                    }
                    placeholder="C5H10O2"
                    className="h-9 font-mono"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && canSaveNew) saveNew();
                    }}
                  />
                </td>
                <td className="px-3 py-2 text-muted-foreground font-mono text-xs">
                  {newPreview?.type ?? "—"}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {newPreview?.c ?? "—"}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {newPreview?.h ?? "—"}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {newPreview?.o ?? "—"}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {newPreview?.mm ?? "—"}
                </td>
                <td className="px-3 py-2 text-right">
                  {canSaveNew && (
                    <Button
                      size="sm"
                      onClick={saveNew}
                      disabled={savingNew}
                      className="h-8"
                    >
                      {savingNew ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <Plus className="h-3.5 w-3.5" /> Save
                        </>
                      )}
                    </Button>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t bg-slate-50/50 px-4 py-3 text-sm">
          <div className="text-muted-foreground">
            Página {page + 1} de {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4" /> Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              Siguiente <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Delete dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar compuesto</DialogTitle>
            <DialogDescription>
              Vas a eliminar permanentemente{" "}
              <span className="font-semibold">{deleteTarget?.compound}</span>{" "}
              (CN #{deleteTarget?.id}). Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CompoundRow({
  row,
  isEditing,
  isSaving,
  draft,
  onStartEdit,
  onCancel,
  onSave,
  onChangeDraft,
  onDelete,
  constants,
}: {
  row: Compound;
  isEditing: boolean;
  isSaving: boolean;
  draft: EditDraft | null;
  onStartEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  onChangeDraft: (d: EditDraft) => void;
  onDelete: () => void;
  constants: AtomicConstants;
}) {
  if (!isEditing || !draft) {
    return (
      <tr className="group hover:bg-slate-50/70 transition-colors">
        <td className="px-3 py-2.5 text-muted-foreground tabular-nums">
          {row.id}
        </td>
        <td
          className="px-3 py-2.5 font-medium cursor-pointer"
          onClick={onStartEdit}
          title="Click para editar"
        >
          {row.compound}
        </td>
        <td
          className="px-3 py-2.5 tabular-nums cursor-pointer"
          onClick={onStartEdit}
        >
          {row.rir}
        </td>
        <td
          className="px-3 py-2.5 font-mono text-xs cursor-pointer"
          onClick={onStartEdit}
        >
          {row.cf}
        </td>
        <td className="px-3 py-2.5 cursor-pointer" onClick={onStartEdit}>
          <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-xs font-mono">
            {row.type}
          </span>
        </td>
        <td
          className="px-3 py-2.5 tabular-nums cursor-pointer"
          onClick={onStartEdit}
        >
          {row.c_count}
        </td>
        <td
          className="px-3 py-2.5 tabular-nums cursor-pointer"
          onClick={onStartEdit}
        >
          {row.h_count}
        </td>
        <td
          className="px-3 py-2.5 tabular-nums cursor-pointer"
          onClick={onStartEdit}
        >
          {row.o_count}
        </td>
        <td
          className="px-3 py-2.5 tabular-nums cursor-pointer"
          onClick={onStartEdit}
        >
          {Number(row.mm_da).toFixed(2)}
        </td>
        <td className="px-3 py-2.5 text-right">
          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={onStartEdit}
              aria-label="Editar"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-destructive hover:bg-destructive/10"
              onClick={onDelete}
              aria-label="Eliminar"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </td>
      </tr>
    );
  }

  const parsed = parseCF(draft.cf);
  const expectedMM = calculateMM(parsed, constants);
  const expectedType = calculateType(parsed.c, parsed.o);
  const userC = parseInt(draft.c_count, 10);
  const userH = parseInt(draft.h_count, 10);
  const userO = parseInt(draft.o_count, 10);
  const userMM = parseFloat(draft.mm_da);

  const cInvalid = !validateCFField(userC, parsed.c);
  const hInvalid = !validateCFField(userH, parsed.h);
  const oInvalid = !validateCFField(userO, parsed.o);
  const typeInvalid = draft.type !== expectedType;
  const mmInvalid = !validateNumericField(userMM, expectedMM, 0.01);

  return (
    <tr className="bg-amber-50/40">
      <td className="px-3 py-2 text-muted-foreground tabular-nums">{row.id}</td>
      <td className="px-2 py-2">
        <input
          autoFocus
          className="cell-input"
          value={draft.compound}
          onChange={(e) =>
            onChangeDraft({ ...draft, compound: e.target.value })
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") onSave();
            if (e.key === "Escape") onCancel();
          }}
        />
      </td>
      <td className="px-2 py-2">
        <input
          inputMode="numeric"
          className="cell-input tabular-nums"
          value={draft.rir}
          onChange={(e) => onChangeDraft({ ...draft, rir: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSave();
            if (e.key === "Escape") onCancel();
          }}
        />
      </td>
      <td className="px-2 py-2">
        <input
          className="cell-input font-mono text-xs"
          value={draft.cf}
          onChange={(e) => {
            const newCF = e.target.value;
            const np = parseCF(newCF);
            const newMM = calculateMM(np, constants);
            onChangeDraft({
              ...draft,
              cf: newCF,
              c_count: String(np.c),
              h_count: String(np.h),
              o_count: String(np.o),
              type: calculateType(np.c, np.o),
              mm_da: String(newMM),
            });
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSave();
            if (e.key === "Escape") onCancel();
          }}
        />
      </td>
      <td className="px-2 py-2">
        <input
          className={cn("cell-input font-mono text-xs", typeInvalid && "cell-error")}
          value={draft.type}
          onChange={(e) => onChangeDraft({ ...draft, type: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSave();
            if (e.key === "Escape") onCancel();
          }}
        />
      </td>
      <td className="px-2 py-2">
        <input
          className={cn("cell-input tabular-nums", cInvalid && "cell-error")}
          value={draft.c_count}
          inputMode="numeric"
          onChange={(e) => onChangeDraft({ ...draft, c_count: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSave();
            if (e.key === "Escape") onCancel();
          }}
        />
      </td>
      <td className="px-2 py-2">
        <input
          className={cn("cell-input tabular-nums", hInvalid && "cell-error")}
          value={draft.h_count}
          inputMode="numeric"
          onChange={(e) => onChangeDraft({ ...draft, h_count: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSave();
            if (e.key === "Escape") onCancel();
          }}
        />
      </td>
      <td className="px-2 py-2">
        <input
          className={cn("cell-input tabular-nums", oInvalid && "cell-error")}
          value={draft.o_count}
          inputMode="numeric"
          onChange={(e) => onChangeDraft({ ...draft, o_count: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSave();
            if (e.key === "Escape") onCancel();
          }}
        />
      </td>
      <td className="px-2 py-2">
        <input
          className={cn("cell-input tabular-nums", mmInvalid && "cell-error")}
          value={draft.mm_da}
          inputMode="decimal"
          onChange={(e) => onChangeDraft({ ...draft, mm_da: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSave();
            if (e.key === "Escape") onCancel();
          }}
        />
      </td>
      <td className="px-3 py-2 text-right">
        <div className="flex justify-end gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-emerald-600 hover:bg-emerald-50"
            onClick={onSave}
            disabled={isSaving}
            aria-label="Guardar"
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={onCancel}
            disabled={isSaving}
            aria-label="Cancelar"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}
