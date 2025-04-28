import { Shell } from "@/components/layout/shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

export default function ScannerPage() {
  return (
    <Shell>
      <PageHeader
        title="Escáner de Recibos"
        description="Escanea tus recibos para crear transacciones automáticamente"
        actions={
          <Button>
            <Upload className="mr-2 h-4 w-4" />
            Subir Imagen
          </Button>
        }
      />
      
      <div className="grid gap-4">
        <div className="p-8 text-center rounded-lg border">
          <h3 className="text-lg font-medium mb-2">Sección en Desarrollo</h3>
          <p className="text-muted-foreground">
            Esta sección para escanear recibos y facturas está en construcción.
          </p>
        </div>
      </div>
    </Shell>
  );
}