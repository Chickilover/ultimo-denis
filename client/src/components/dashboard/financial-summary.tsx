import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useCurrency } from "@/hooks/use-currency";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Banknote, CreditCard, ArrowUp, ArrowDown } from "lucide-react";

// Helper function to get formatted date ranges
function getDateRange(periodType: string) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  
  let startDate, endDate;
  
  if (periodType === "month") {
    startDate = new Date(year, month, 1);
    endDate = new Date(year, month + 1, 0);
  } else if (periodType === "year") {
    startDate = new Date(year, 0, 1);
    endDate = new Date(year, 11, 31);
  } else {
    // Custom period (default to current month)
    startDate = new Date(year, month, 1);
    endDate = new Date(year, month + 1, 0);
  }
  
  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0]
  };
}

export function FinancialSummary() {
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const { formatCurrency, defaultCurrency } = useCurrency();
  
  // Calculate date range based on selected period
  const dateRange = useMemo(() => getDateRange(selectedPeriod), [selectedPeriod]);
  
  // Fetch accounts for total balance
  const { data: accounts = [] } = useQuery({
    queryKey: ["/api/accounts"],
    queryFn: getQueryFn({ on401: "throw" })
  });
  
  // Fetch transactions for income/expense
  const { data: transactions = [] } = useQuery({
    queryKey: [
      "/api/transactions", 
      dateRange.startDate, 
      dateRange.endDate
    ],
    queryFn: getQueryFn({ on401: "throw" })
  });
  
  // Calculate totals
  const totalBalance = useMemo(() => {
    // Si no hay cuentas, calculamos el saldo total como ingresos menos gastos
    if (accounts.length === 0) {
      return transactions.reduce((balance: number, tx: any) => {
        const amount = parseFloat(tx.amount);
        
        // Convert to default currency if needed
        const convertedAmount = tx.currency === defaultCurrency 
          ? amount 
          : (defaultCurrency === "UYU" 
              ? amount * 40 // USD to UYU
              : amount / 40  // UYU to USD
            );
        
        if (tx.transactionTypeId === 1) { // Ingreso
          return balance + convertedAmount;
        } else if (tx.transactionTypeId === 2) { // Gasto
          return balance - convertedAmount;
        }
        return balance;
      }, 0);
    } else {
      // Si hay cuentas, usamos el saldo de las cuentas
      return accounts.reduce((total: number, account: any) => {
        // Convert account balance to the default currency if needed
        const accountBalance = parseFloat(account.currentBalance);
        if (account.currency === defaultCurrency) {
          return total + accountBalance;
        } else {
          // Simple conversion - in real app would use exchange rate
          return total + (defaultCurrency === "UYU" 
            ? accountBalance * 40 // USD to UYU
            : accountBalance / 40 // UYU to USD
          );
        }
      }, 0);
    }
  }, [accounts, transactions, defaultCurrency]);
  
  // Calculamos totales separando personal y compartido (hogar)
  const { totalIncome, totalExpense, personalIncome, personalExpense, householdIncome, householdExpense } = useMemo(() => {
    return transactions.reduce((totals: { 
      totalIncome: number, 
      totalExpense: number,
      personalIncome: number,
      personalExpense: number,
      householdIncome: number,
      householdExpense: number
    }, tx: any) => {
      const amount = parseFloat(tx.amount);
      
      // Convert to default currency if needed
      const convertedAmount = tx.currency === defaultCurrency 
        ? amount 
        : (defaultCurrency === "UYU" 
            ? amount * 40 // USD to UYU
            : amount / 40  // UYU to USD
          );
      
      // Agregar al total general
      if (tx.transactionTypeId === 1) { // Income
        totals.totalIncome += convertedAmount;
        // También sumar a personal o hogar según corresponda
        if (tx.isShared) {
          totals.householdIncome += convertedAmount;
        } else {
          totals.personalIncome += convertedAmount;
        }
      } else if (tx.transactionTypeId === 2) { // Expense
        totals.totalExpense += convertedAmount;
        // También sumar a personal o hogar según corresponda
        if (tx.isShared) {
          totals.householdExpense += convertedAmount;
        } else {
          totals.personalExpense += convertedAmount;
        }
      }
      
      return totals;
    }, { 
      totalIncome: 0, 
      totalExpense: 0,
      personalIncome: 0,
      personalExpense: 0,
      householdIncome: 0,
      householdExpense: 0
    });
  }, [transactions, defaultCurrency]);
  
  // Buscar transacciones del periodo anterior para calcular cambios
  // Obtener el rango de fechas para el periodo anterior
  const getPreviousPeriodRange = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    
    let startDate, endDate;
    
    if (selectedPeriod === "month") {
      // Mes anterior
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0);
    } else {
      // Año anterior
      startDate = new Date(year - 1, 0, 1);
      endDate = new Date(year - 1, 11, 31);
    }
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  };
  
  // Usamos valores de 0 por defecto para indicar que no hay cambios calculados
  // Esto evita usar datos falsos cuando no hay datos históricos
  const incomeChange = 0;
  const expenseChange = 0;
  
  // Calcular balances
  const netBalance = totalIncome - totalExpense;
  const personalNetBalance = personalIncome - personalExpense;
  const householdNetBalance = householdIncome - householdExpense;
  
  // Estado para cambiar entre vista general, personal o familiar
  const [viewMode, setViewMode] = useState<'all' | 'personal' | 'household'>('all');
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Resumen Financiero</h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border p-1">
            <button 
              onClick={() => setViewMode('all')} 
              className={`px-3 py-1.5 text-sm rounded-sm ${viewMode === 'all' ? 'bg-primary text-white' : 'hover:bg-muted'}`}
            >
              General
            </button>
            <button 
              onClick={() => setViewMode('personal')} 
              className={`px-3 py-1.5 text-sm rounded-sm ${viewMode === 'personal' ? 'bg-primary text-white' : 'hover:bg-muted'}`}
            >
              Personal
            </button>
            <button 
              onClick={() => setViewMode('household')} 
              className={`px-3 py-1.5 text-sm rounded-sm ${viewMode === 'household' ? 'bg-primary text-white' : 'hover:bg-muted'}`}
            >
              Hogar
            </button>
          </div>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Seleccionar período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Mes actual</SelectItem>
              <SelectItem value="year">Año actual</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Sección de todas las finanzas */}
      {viewMode === 'all' && (
        <>
          {/* Balance neto (destacado) - ahora es su propia tarjeta */}
          <Card className={`${netBalance >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
            <CardContent className="pt-6 pb-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-base font-semibold text-muted-foreground">Saldo final ({selectedPeriod === "month" ? "Mes" : "Año"})</p>
                  <div className="flex items-center">
                    <h3 className="text-3xl font-bold font-mono">{formatCurrency(netBalance)}</h3>
                    <span className={`ml-2 text-sm ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      (Ingresos - Gastos)
                    </span>
                  </div>
                </div>
                <div className={`rounded-full p-4 ${netBalance >= 0 ? 'bg-green-100 dark:bg-green-900/50' : 'bg-red-100 dark:bg-red-900/50'}`}>
                  {netBalance >= 0 ? (
                    <ArrowUp className="h-8 w-8 text-green-600 dark:text-green-400" />
                  ) : (
                    <ArrowDown className="h-8 w-8 text-red-600 dark:text-red-400" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Saldo total</p>
                    <h3 className="text-2xl font-bold font-mono">{formatCurrency(totalBalance)}</h3>
                  </div>
                  <div className="bg-primary-100 dark:bg-primary-900/50 rounded-full p-3">
                    <Banknote className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Ingresos ({selectedPeriod === "month" ? "Mes" : "Año"})
                    </p>
                    <h3 className="text-2xl font-bold font-mono">{formatCurrency(totalIncome)}</h3>
                    <span className="text-green-500 text-sm flex items-center">
                      <ArrowUp className="h-4 w-4 mr-1" />
                      +{incomeChange}% vs. {selectedPeriod === "month" ? "mes anterior" : "año anterior"}
                    </span>
                  </div>
                  <div className="bg-green-100 dark:bg-green-900/50 rounded-full p-3">
                    <ArrowUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Gastos ({selectedPeriod === "month" ? "Mes" : "Año"})
                    </p>
                    <h3 className="text-2xl font-bold font-mono">{formatCurrency(totalExpense)}</h3>
                    <span className="text-red-500 text-sm flex items-center">
                      <ArrowDown className="h-4 w-4 mr-1" />
                      +{expenseChange}% vs. {selectedPeriod === "month" ? "mes anterior" : "año anterior"}
                    </span>
                  </div>
                  <div className="bg-red-100 dark:bg-red-900/50 rounded-full p-3">
                    <CreditCard className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
      
      {/* Sección de finanzas personales */}
      {viewMode === 'personal' && (
        <>
          {/* Balance neto personal - tarjeta destacada */}
          <Card className={`${personalNetBalance >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
            <CardContent className="pt-6 pb-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-base font-semibold text-muted-foreground">Saldo Personal ({selectedPeriod === "month" ? "Mes" : "Año"})</p>
                  <div className="flex items-center">
                    <h3 className="text-3xl font-bold font-mono">{formatCurrency(personalNetBalance)}</h3>
                    <span className={`ml-2 text-sm ${personalNetBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      (Ingresos - Gastos)
                    </span>
                  </div>
                </div>
                <div className={`rounded-full p-4 ${personalNetBalance >= 0 ? 'bg-green-100 dark:bg-green-900/50' : 'bg-red-100 dark:bg-red-900/50'}`}>
                  {personalNetBalance >= 0 ? (
                    <ArrowUp className="h-8 w-8 text-green-600 dark:text-green-400" />
                  ) : (
                    <ArrowDown className="h-8 w-8 text-red-600 dark:text-red-400" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">            
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Ingresos Personales
                    </p>
                    <h3 className="text-2xl font-bold font-mono">{formatCurrency(personalIncome)}</h3>
                  </div>
                  <div className="bg-green-100 dark:bg-green-900/50 rounded-full p-3">
                    <ArrowUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Gastos Personales
                    </p>
                    <h3 className="text-2xl font-bold font-mono">{formatCurrency(personalExpense)}</h3>
                  </div>
                  <div className="bg-red-100 dark:bg-red-900/50 rounded-full p-3">
                    <CreditCard className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
      
      {/* Sección de finanzas del hogar */}
      {viewMode === 'household' && (
        <>
          {/* Balance neto del hogar - tarjeta destacada */}
          <Card className={`${householdNetBalance >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
            <CardContent className="pt-6 pb-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-base font-semibold text-muted-foreground">Saldo del Hogar ({selectedPeriod === "month" ? "Mes" : "Año"})</p>
                  <div className="flex items-center">
                    <h3 className="text-3xl font-bold font-mono">{formatCurrency(householdNetBalance)}</h3>
                    <span className={`ml-2 text-sm ${householdNetBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      (Ingresos - Gastos)
                    </span>
                  </div>
                </div>
                <div className={`rounded-full p-4 ${householdNetBalance >= 0 ? 'bg-green-100 dark:bg-green-900/50' : 'bg-red-100 dark:bg-red-900/50'}`}>
                  {householdNetBalance >= 0 ? (
                    <ArrowUp className="h-8 w-8 text-green-600 dark:text-green-400" />
                  ) : (
                    <ArrowDown className="h-8 w-8 text-red-600 dark:text-red-400" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">            
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Ingresos del Hogar
                    </p>
                    <h3 className="text-2xl font-bold font-mono">{formatCurrency(householdIncome)}</h3>
                  </div>
                  <div className="bg-green-100 dark:bg-green-900/50 rounded-full p-3">
                    <ArrowUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Gastos del Hogar
                    </p>
                    <h3 className="text-2xl font-bold font-mono">{formatCurrency(householdExpense)}</h3>
                  </div>
                  <div className="bg-red-100 dark:bg-red-900/50 rounded-full p-3">
                    <CreditCard className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
