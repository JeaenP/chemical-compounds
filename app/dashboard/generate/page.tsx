import { GenerateTable } from "@/components/generate/GenerateTable";

export const metadata = {
  title: "Generar Tabla | Chemical Compounds Manager",
};

export default function GeneratePage({
  searchParams,
}: {
  searchParams: { tableId?: string };
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Generar Tabla</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pegá una lista de compuestos, dejá que el sistema los identifique con
          matching difuso y exportá a Excel.
        </p>
      </div>
      <GenerateTable initialTableId={searchParams.tableId} />
    </div>
  );
}
