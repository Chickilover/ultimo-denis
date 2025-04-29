import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/use-currency";
import { Skeleton } from "@/components/ui/skeleton";

export function ExchangeRateDisplay() {
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { exchangeRate, updateExchangeRate } = useCurrency();

  // Función para refrescar el tipo de cambio
  const refreshExchangeRate = async () => {
    setIsUpdating(true);
    
    try {
      // Forzar actualización de datos desde el servidor
      await queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      
      toast({
        title: "Tipo de cambio actualizado",
        description: `1 USD = ${exchangeRate} UYU`
      });
    } catch (error) {
      console.error("Error al actualizar tipo de cambio:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el tipo de cambio",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Se eliminó la comprobación de carga ya que usamos el hook useCurrency

  return (
    <div className="flex items-center space-x-2 text-sm">
      <span className="whitespace-nowrap">1 USD = {exchangeRate} UYU</span>
      <Button 
        size="icon" 
        variant="ghost" 
        className="h-7 w-7" 
        onClick={refreshExchangeRate}
        disabled={isUpdating}
      >
        <RefreshCcw className={`h-4 w-4 ${isUpdating ? 'animate-spin' : ''}`} />
      </Button>
    </div>
  );
}