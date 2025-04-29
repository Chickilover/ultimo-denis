import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useState, useEffect, createContext, useContext, ReactNode } from "react";

// Definir el tipo de contexto de moneda
type CurrencyContextType = {
  exchangeRate: number;
  defaultCurrency: string;
  setDefaultCurrency: (currency: string) => void;
  formatCurrency: (amount: number, currency?: string) => string;
  convertCurrency: (amount: number, fromCurrency: string, toCurrency: string) => number;
  updateExchangeRate: (newRate: string) => void;
};

// Crear el contexto con valores por defecto
const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

// Proveedor de contexto de moneda
export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [exchangeRate, setExchangeRate] = useState<number>(38);
  const [defaultCurrency, setDefaultCurrency] = useState<string>("UYU");
  const queryClient = useQueryClient();
  
  // Obtener la configuración para el tipo de cambio
  const { data: settings } = useQuery({
    queryKey: ["/api/settings"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Actualizar el tipo de cambio y la moneda predeterminada cuando se cargan los datos
  useEffect(() => {
    if (settings) {
      // Actualizar tipo de cambio
      if (settings.exchangeRate) {
        const rate = parseFloat(settings.exchangeRate);
        if (!isNaN(rate) && rate > 0) {
          setExchangeRate(rate);
        }
      }
      
      // Actualizar moneda predeterminada
      if (settings.defaultCurrency) {
        setDefaultCurrency(settings.defaultCurrency);
      }
    }
  }, [settings]);

  // Función para formatear moneda
  const formatCurrency = (amount: number, currency = "UYU") => {
    if (currency === "USD") {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount);
    } else {
      return new Intl.NumberFormat("es-UY", {
        style: "currency",
        currency: "UYU",
        maximumFractionDigits: 0,
      }).format(amount);
    }
  };

  // Función para convertir entre monedas
  const convertCurrency = (amount: number, fromCurrency: string, toCurrency: string) => {
    if (fromCurrency === toCurrency) {
      return amount;
    }

    if (fromCurrency === "USD" && toCurrency === "UYU") {
      return amount * exchangeRate;
    }

    if (fromCurrency === "UYU" && toCurrency === "USD") {
      return amount / exchangeRate;
    }

    return amount;
  };
  
  // Función para actualizar el tipo de cambio
  const updateExchangeRate = (newRate: string) => {
    const parsedRate = parseFloat(newRate);
    if (!isNaN(parsedRate) && parsedRate > 0) {
      setExchangeRate(parsedRate);
      // Invalidar las consultas de configuración para forzar la actualización en toda la app
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    }
  };

  const value = {
    formatCurrency,
    convertCurrency,
    exchangeRate,
    defaultCurrency,
    setDefaultCurrency,
    updateExchangeRate
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

// Hook personalizado para usar el contexto de moneda
export function useCurrency() {
  const context = useContext(CurrencyContext);
  
  if (context === undefined) {
    throw new Error('useCurrency debe ser usado dentro de un CurrencyProvider');
  }
  
  return context;
}