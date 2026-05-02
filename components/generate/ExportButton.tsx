"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { computeSummaries, type ResultRow } from "@/components/generate/GenerateTable";

const HEADERS = [
  "CN",
  "RT",
  "Compound",
  "RIC",
  "RIR",
  "%",
  "SD",
  "Type",
  "CF",
  "MM (Da)",
  "Val1",
  "Val2",
];

function rowToValues(
  row: ResultRow,
  next: ResultRow | undefined,
): Array<string | number> {
  const ric = parseFloat(row.ric);
  const rir = typeof row.rir === "number" ? row.rir : NaN;
  const val1 =
    Number.isFinite(ric) && Number.isFinite(rir)
      ? Math.round((ric - rir) * 100) / 100
      : "";
  let val2: number | string = "";
  if (next) {
    const a = typeof row.rir === "number" ? row.rir : NaN;
    const b = typeof next.rir === "number" ? next.rir : NaN;
    if (Number.isFinite(a) && Number.isFinite(b)) val2 = b - a;
  }
  return [
    row.cn,
    row.rt,
    row.compound,
    row.ric,
    row.rir === "" ? "" : row.rir,
    row.percent,
    row.sd,
    row.type,
    row.cf,
    row.mm_da === "" ? "" : row.mm_da,
    val1,
    val2,
  ];
}

export function ExportButton({ rows }: { rows: ResultRow[] }) {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    if (rows.length === 0) return;
    setLoading(true);
    try {
      const ExcelJS = (await import("exceljs")).default;
      const wb = new ExcelJS.Workbook();
      wb.creator = "Chemical Compounds Manager";
      wb.created = new Date();
      const ws = wb.addWorksheet("Compuestos");

      // Header row
      ws.addRow(HEADERS);
      const headerRow = ws.getRow(1);
      headerRow.eachCell((cell) => {
        cell.font = {
          name: "Palatino Linotype",
          size: 10,
          bold: true,
        };
        cell.border = {
          top: { style: "thin" },
          bottom: { style: "thin" },
        };
        cell.alignment = { vertical: "middle", horizontal: "left" };
      });

      // Data rows
      rows.forEach((row, idx) => {
        const values = rowToValues(row, rows[idx + 1]);
        const r = ws.addRow(values);
        r.eachCell((cell) => {
          cell.font = {
            name: "Palatino Linotype",
            size: 10,
          };
        });
      });

      // Summary rows (label under Compound, sum under %)
      const summaries = computeSummaries(rows);
      if (summaries.length > 0) {
        ws.addRow([]); // blank separator
        summaries.forEach((s) => {
          const values: Array<string | number> = [
            "",
            "",
            s.label,
            "",
            "",
            s.sum,
            "",
            "",
            "",
            "",
            "",
            "",
          ];
          const r = ws.addRow(values);
          for (let col = 1; col <= 12; col++) {
            r.getCell(col).font = {
              name: "Palatino Linotype",
              size: 10,
            };
          }
          // Bottom border from Compound (col 3) through % (col 6)
          for (let col = 3; col <= 6; col++) {
            r.getCell(col).border = {
              bottom: { style: "thin" },
            };
          }
        });
      }

      // Approximate column widths
      const widths = [6, 8, 36, 10, 10, 8, 8, 8, 14, 12, 8, 8];
      ws.columns.forEach((col, i) => {
        col.width = widths[i] ?? 12;
      });

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tabla_compuestos_${formatDate()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Excel generado");
    } catch (err) {
      console.error(err);
      toast.error("Error generando el archivo");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={handleExport} disabled={loading || rows.length === 0}>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      Exportar a Excel
    </Button>
  );
}
