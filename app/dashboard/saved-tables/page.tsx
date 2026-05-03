import { SavedTablesList } from "@/components/saved/SavedTablesList";

export const metadata = {
  title: "Tablas Guardadas | Chemical Compounds Manager",
};

export default function SavedTablesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tablas Guardadas</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Listado de tablas generadas que guardaste. Click en Editar para
          continuar trabajando sobre una tabla existente.
        </p>
      </div>
      <SavedTablesList />
    </div>
  );
}
