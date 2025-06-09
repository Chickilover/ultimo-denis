import { useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query"; // Import QueryKey
import { getQueryFn } from "@/lib/queryClient";
import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import type { Settings } from "@shared/schema"; // Import the Settings type

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
  const [exchangeRate, setExchangeRate] = useState<number>(38); // Default initial value
  const [defaultCurrency, setDefaultCurrency] = useState<string>("UYU"); // Default initial value
  const queryClient = useQueryClient();
  
  // Obtener la configuración para el tipo de cambio
  // Specify the types for useQuery: <TQueryFnData, TError, TData, TQueryKey>
  // TQueryFnData: type returned by queryFn. If getQueryFn can return Settings | null.
  // TData: type of resolved data.
  // TQueryKey: type of the query key.
  const { data: settingsData } = useQuery<Settings | null, Error, Settings | null, QueryKey>({
    queryKey: ["/api/settings"], // QueryKey type will infer this as string[] or ReadonlyArray<string>
    queryFn: getQueryFn({ on401: "returnNull" }), // getQueryFn should be compatible
    staleTime: 5 * 60 * 1000, // 5 minutos
    // TData is Settings | null because select is not used.
  });

  // Actualizar el tipo de cambio y la moneda predeterminada cuando se cargan los datos
  useEffect(() => {
    // settingsData can be Settings, null, or undefined while loading/error
    if (settingsData) { // This check handles null and undefined
      // Actualizar tipo de cambio
      if (settingsData.exchangeRate) { // This implies exchangeRate is optional on Settings or can be null
        const rate = parseFloat(settingsData.exchangeRate); // exchangeRate is string in Settings
        if (!isNaN(rate) && rate > 0) {
          setExchangeRate(rate);
        }
      }
      
      // Actualizar moneda predeterminada
      if (settingsData.defaultCurrency) { // This implies defaultCurrency is optional or can be null
        setDefaultCurrency(settingsData.defaultCurrency);
      }
    }
  }, [settingsData]);

  // Función para formatear moneda
  const formatCurrency = (amount: number, currency?: string) => {
    const targetCurrency = currency || defaultCurrency; // Use context's defaultCurrency if not provided
    if (targetCurrency === "USD") {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount);
    } else { // Assuming UYU or any other
      return new Intl.NumberFormat("es-UY", {
        style: "currency",
        currency: "UYU", // Should ideally use targetCurrency here if more currencies are supported
        maximumFractionDigits: 0, // Specific to UYU, might need adjustment for others
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
      // Avoid division by zero if exchangeRate is somehow 0
      return exchangeRate !== 0 ? amount / exchangeRate : 0;
    }

    // Placeholder for other conversions if needed
    console.warn(`Conversion from ${fromCurrency} to ${toCurrency} not implemented, returning original amount.`);
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