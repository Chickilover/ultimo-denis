import { Shell } from "@/components/layout/shell";
import { PageHeader } from "@/components/layout/page-header";

export default function ReportsPage() {
  return (
    <Shell>
      <PageHeader
        title="Reportes"
        description="Analiza tus finanzas personales y familiares"
      />
      
      <div className="grid gap-4">
        <div className="p-8 text-center rounded-lg border">
          <h3 className="text-lg font-medium mb-2">Sección en Desarrollo</h3>
          <p className="text-muted-foreground">
            Esta sección para visualizar reportes financieros está en construcción.
          </p>
        </div>
      </div>
    </Shell>
  );
}