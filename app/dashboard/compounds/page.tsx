import { CompoundsTable } from "@/components/compounds/CompoundsTable";

export const metadata = {
  title: "Lista de Compuestos | Chemical Compounds Manager",
};

export default function CompoundsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Lista de Compuestos
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gestión completa de la base de compuestos químicos. Edición inline,
          validación automática.
        </p>
      </div>
      <CompoundsTable />
    </div>
  );
}
