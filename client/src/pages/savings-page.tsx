import { Shell } from "@/components/layout/shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

export default function SavingsPage() {
  return (
    <Shell>
      <PageHeader
        title="Metas de Ahorro"
        description="Administra tus objetivos de ahorro personal y familiar"
        actions={
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nueva Meta
          </Button>
        }
      />
      
      <div className="grid gap-4">
        <div className="p-8 text-center rounded-lg border">
          <h3 className="text-lg font-medium mb-2">Sección en Desarrollo</h3>
          <p className="text-muted-foreground">
            Esta sección para administrar tus metas de ahorro está en construcción.
          </p>
        </div>
      </div>
    </Shell>
  );
}