import { Shell } from "@/components/layout/shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";

export default function AdvisorPage() {
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

  useEffect(() => {
    // Comprobar si existe la clave API de OpenAI
    const checkOpenAIKey = async () => {
      try {
        const response = await apiRequest("POST", "/api/check-secrets", { secretKeys: ['OPENAI_API_KEY'] });
        const result = await response.json();
        setHasApiKey(result.OPENAI_API_KEY);
      } catch (error) {
        setHasApiKey(false);
        console.error("Error al verificar la clave API:", error);
      }
    };
    
    checkOpenAIKey();
  }, []);

  return (
    <Shell>
      <PageHeader
        title="Asesor IA"
        description="Consulta a tu asistente financiero personal"
        actions={
          <Button>
            <MessageSquare className="mr-2 h-4 w-4" />
            Nueva Consulta
          </Button>
        }
      />
      
      <div className="grid gap-4">
        {hasApiKey === false && (
          <div className="p-6 bg-amber-50 text-amber-800 rounded-lg border border-amber-200">
            <h3 className="text-lg font-medium mb-2">Se requiere una API Key de OpenAI</h3>
            <p className="mb-4">
              Para utilizar el Asesor IA, se necesita configurar una clave API de OpenAI.
              Por favor, contacta con el administrador para configurarla.
            </p>
          </div>
        )}
        
        <div className="p-8 text-center rounded-lg border">
          <h3 className="text-lg font-medium mb-2">Sección en Desarrollo</h3>
          <p className="text-muted-foreground">
            Esta sección para consultar a tu asesor financiero IA está en construcción.
          </p>
        </div>
      </div>
    </Shell>
  );
}