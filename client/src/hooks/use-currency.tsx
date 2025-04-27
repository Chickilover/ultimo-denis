import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "./use-auth";
import { Settings } from "@shared/schema";

interface CurrencyContextType {
  defaultCurrency: "UYU" | "USD";
  setDefaultCurrency: (currency: "UYU" | "USD") => void;
  exchangeRate: number;
  setExchangeRate: (rate: number) => void;
  formatCurrency: (amount: number | string, currency?: "UYU" | "USD") => string;
  convertCurrency: (amount: number | string, fromCurrency: "UYU" | "USD", toCurrency: "UYU" | "USD") => number;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [defaultCurrency, setDefaultCurrency] = useState<"UYU" | "USD">("UYU");
  const [exchangeRate, setExchangeRate] = useState<number>(40.0); // Default exchange rate: 1 USD = 40 UYU
  
  // Fetch user settings
  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!user,
  });
  
  // Update settings when currency preferences change
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: { defaultCurrency: string; exchangeRate: number }) => {
      const res = await apiRequest("PUT", "/api/settings", {
        defaultCurrency: data.defaultCurrency,
        exchangeRate: data.exchangeRate.toString(),
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/settings"], data);
    },
  });
  
  // Initialize from settings
  useEffect(() => {
    if (settings) {
      setDefaultCurrency(settings.defaultCurrency as "UYU" | "USD");
      setExchangeRate(parseFloat(settings.exchangeRate.toString()) || 40.0);
    }
  }, [settings]);
  
  // Update settings when currency preferences change
  useEffect(() => {
    if (user && settings) {
      if (
        settings.defaultCurrency !== defaultCurrency ||
        parseFloat(settings.exchangeRate.toString()) !== exchangeRate
      ) {
        updateSettingsMutation.mutate({
          defaultCurrency,
          exchangeRate,
        });
      }
    }
  }, [defaultCurrency, exchangeRate, user, settings]);
  
  // Format currency according to UY locale
  const formatCurrency = (amount: number | string, currency: "UYU" | "USD" = defaultCurrency): string => {
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    
    if (isNaN(numAmount)) return currency === "UYU" ? "$U 0,00" : "US$ 0.00";
    
    if (currency === "UYU") {
      // Format as Uruguayan Peso with the $U symbol
      return new Intl.NumberFormat("es-UY", {
        style: "currency",
        currency: "UYU",
        currencyDisplay: "symbol",
      })
        .format(numAmount)
        .replace("UYU", "$U");
    } else {
      // Format as US Dollar
      return new Intl.NumberFormat("es-UY", {
        style: "currency",
        currency: "USD",
        currencyDisplay: "symbol",
      })
        .format(numAmount)
        .replace("USD", "US$");
    }
  };
  
  // Convert between currencies
  const convertCurrency = (
    amount: number | string,
    fromCurrency: "UYU" | "USD",
    toCurrency: "UYU" | "USD"
  ): number => {
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    
    if (isNaN(numAmount)) return 0;
    if (fromCurrency === toCurrency) return numAmount;
    
    if (fromCurrency === "UYU" && toCurrency === "USD") {
      return numAmount / exchangeRate;
    } else {
      return numAmount * exchangeRate;
    }
  };
  
  const value = {
    defaultCurrency,
    setDefaultCurrency,
    exchangeRate,
    setExchangeRate,
    formatCurrency,
    convertCurrency,
  };
  
  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error("useCurrency debe ser usado dentro de un CurrencyProvider");
  }
  return context;
}
