import { create } from 'zustand';
import { useQueryClient } from '@tanstack/react-query';
import type { Settings } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

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
  exchangeRate: '38',
  setExchangeRate: (rate) => set({ exchangeRate: rate }),
  isExchangeRateUpdating: false,
  setIsExchangeRateUpdating: (updating) => set({ isExchangeRateUpdating: updating }),
}));

// Hook personalizado para refrescar el tipo de cambio
export function useExchangeRateSync() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { exchangeRate, setExchangeRate, setIsExchangeRateUpdating } = useProfileSettings();

  // Función para refrescar manualmente el tipo de cambio desde el servidor
  const refreshExchangeRate = async () => {
    setIsExchangeRateUpdating(true);
    
    try {
      // Invalidar caché y volver a obtener la configuración
      await queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      const data = await queryClient.fetchQuery<Settings>({ queryKey: ["/api/settings"] });
      
      if (data && data.exchangeRate) {
        setExchangeRate(data.exchangeRate);
        toast({
          title: "Tipo de cambio sincronizado",
          description: `El tipo de cambio actual es ${data.exchangeRate}`
        });
      }
    } catch (error) {
      console.error("Error al refrescar el tipo de cambio:", error);
      toast({
        title: "Error",
        description: "No se pudo sincronizar el tipo de cambio",
        variant: "destructive"
      });
    } finally {
      setIsExchangeRateUpdating(false);
    }
  };

  return { refreshExchangeRate, exchangeRate };
}