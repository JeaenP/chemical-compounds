"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createBrowserSupabase } from "@/lib/supabase/client";
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
import { Pencil, Trash2, Loader2, Archive } from "lucide-react";
import { toast } from "sonner";

type SavedTableRow = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export function SavedTablesList() {
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const [tables, setTables] = useState<SavedTableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<SavedTableRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("generated_tables")
        .select("id, name, created_at, updated_at")
        .order("updated_at", { ascending: false });
      setLoading(false);
      if (error) {
        toast.error("Error cargando tablas guardadas");
        return;
      }
      setTables((data ?? []) as SavedTableRow[]);
    })();
  }, [supabase]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase
      .from("generated_tables")
      .delete()
      .eq("id", deleteTarget.id);
    setDeleting(false);
    if (error) {
      toast.error("Error al eliminar");
      return;
    }
    setTables((prev) => prev.filter((t) => t.id !== deleteTarget.id));
    toast.success("Tabla eliminada");
    setDeleteTarget(null);
  }

  return (
    <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
      {loading ? (
        <div className="p-6 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : tables.length === 0 ? (
        <div className="p-12 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-muted-foreground">
            <Archive className="h-5 w-5" />
          </div>
          <p className="mt-3 text-sm font-medium text-foreground">
            Todavía no guardaste ninguna tabla
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Generá una tabla en{" "}
            <Link
              href="/dashboard/generate"
              className="text-primary underline-offset-2 hover:underline"
            >
              Generar Tabla
            </Link>{" "}
            y guardala con el botón &quot;Guardar tabla&quot;.
          </p>
        </div>
      ) : (
        <ul className="divide-y">
          {tables.map((t) => (
            <li
              key={t.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 hover:bg-slate-50/70 transition-colors"
            >
              <div className="min-w-0">
                <p className="font-medium truncate">{t.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Creada {formatDateTime(t.created_at)} · Última modificación{" "}
                  {formatDateTime(t.updated_at)}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/dashboard/generate?tableId=${t.id}`}>
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => setDeleteTarget(t)}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Eliminar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar tabla guardada</DialogTitle>
            <DialogDescription>
              Vas a eliminar permanentemente{" "}
              <span className="font-semibold">{deleteTarget?.name}</span>. Esta
              acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
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

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("es-AR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
