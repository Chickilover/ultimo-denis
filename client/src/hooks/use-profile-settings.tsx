import { create } from 'zustand';
import { useQueryClient, type QueryClient } from '@tanstack/react-query'; // Import QueryClient for typing
import { useToast } from '@/hooks/use-toast';
import type { Settings } from "@shared/schema"; // Import the Settings type

interface ProfileSettingsState {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  exchangeRate: string;
  setExchangeRate: (rate: string) => void;
  isExchangeRateUpdating: boolean;
  setIsExchangeRateUpdating: (updating: boolean) => void;
}

export const useProfileSettings = create<ProfileSettingsState>((set) => ({
  activeTab: 'general',
  setActiveTab: (tab) => set({ activeTab: tab }),
  exchangeRate: '38', // Default value, will be updated from fetched settings
  setExchangeRate: (rate) => set({ exchangeRate: rate }),
  isExchangeRateUpdating: false,
  setIsExchangeRateUpdating: (updating) => set({ isExchangeRateUpdating: updating }),
}));

// Hook personalizado para refrescar el tipo de cambio
export function useExchangeRateSync() {
  const queryClient: QueryClient = useQueryClient(); // Explicitly type queryClient
  const { toast } = useToast();
  const { exchangeRate, setExchangeRate, setIsExchangeRateUpdating } = useProfileSettings();

  // Función para refrescar manualmente el tipo de cambio desde el servidor
  const refreshExchangeRate = async () => {
    setIsExchangeRateUpdating(true);
    
    try {
      // Invalidar caché y volver a obtener la configuración
      await queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      // Simplified typing for fetchQuery: TQueryFnData, TError. TData defaults to TQueryFnData.
      // The queryKey type will be inferred.
      const data = await queryClient.fetchQuery<Settings, Error>({
        queryKey: ["/api/settings"]
      });
      
      // data is potentially Settings or null/undefined if queryFn can return that or an error occurs
      if (data && data.exchangeRate) {
        setExchangeRate(data.exchangeRate); // exchangeRate is string in Settings schema
        toast({
          title: "Tipo de cambio sincronizado",
          description: `El tipo de cambio actual es ${data.exchangeRate}`
        });
      } else {
        // Handle case where data or exchangeRate might be null/undefined
        toast({
          title: "Advertencia",
          description: "No se pudo obtener el tipo de cambio del servidor o está vacío.",
          variant: "default"
        });
      }
    } catch (error) {
      console.error("Error al refrescar el tipo de cambio:", error);
      toast({
        title: "Error",
        description: "No se pudo sincronizar el tipo de cambio.",
        variant: "destructive"
      });
    } finally {
      setIsExchangeRateUpdating(false);
    }
  };

  return { refreshExchangeRate, exchangeRate };
}