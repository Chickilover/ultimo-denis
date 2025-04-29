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
import { Account, Transaction } from "@shared/schema";

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
  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
    queryFn: getQueryFn({ on401: "throw" })
  });
  
  // Fetch transactions for income/expense
  const { data: transactions = [] } = useQuery<Transaction[]>({
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
      return transactions.reduce((balance: number, tx: Transaction) => {
        const amount = parseFloat(tx.amount.toString());
        
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
      return accounts.reduce((total: number, account: Account) => {
        // Convert account balance to the default currency if needed
        const accountBalance = parseFloat(account.currentBalance.toString());
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
    }, tx: Transaction) => {
      const amount = parseFloat(tx.amount.toString());
      
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold">Resumen Financiero</h2>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center rounded-xl border border-border/50 bg-background p-1 shadow-sm w-full sm:w-auto">
            <button 
              onClick={() => setViewMode('all')} 
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                viewMode === 'all' 
                  ? 'bg-gradient-to-r from-primary/90 to-primary text-white shadow-md' 
                  : 'hover:bg-muted/50'
              }`}
            >
              General
            </button>
            <button 
              onClick={() => setViewMode('personal')} 
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                viewMode === 'personal' 
                  ? 'bg-gradient-to-r from-blue-500/90 to-blue-600 text-white shadow-md' 
                  : 'hover:bg-muted/50'
              }`}
            >
              Personal
            </button>
            <button 
              onClick={() => setViewMode('household')} 
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                viewMode === 'household' 
                  ? 'bg-gradient-to-r from-purple-500/90 to-purple-600 text-white shadow-md' 
                  : 'hover:bg-muted/50'
              }`}
            >
              Hogar
            </button>
          </div>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-full sm:w-[160px] rounded-lg border-border/50">
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
          <Card className={`card-app relative overflow-hidden border-0 shadow-lg ${
            netBalance >= 0 
              ? 'bg-gradient-to-br from-green-500/80 to-green-700 dark:from-green-500/90 dark:to-green-700/90' 
              : 'bg-gradient-to-br from-red-500/80 to-red-700 dark:from-red-500/90 dark:to-red-700/90'
          }`}>
            <CardContent className="pt-6 pb-6 text-white">
              {/* Elementos decorativos */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mt-32 -mr-32 opacity-70"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/5 rounded-full blur-2xl"></div>
              
              <div className="flex justify-between items-center relative z-10">
                <div>
                  <p className="text-base font-semibold text-white/90">
                    {selectedPeriod === "month" ? "Saldo mensual" : "Saldo anual"}
                  </p>
                  <div className="flex flex-col">
                    <h3 className="text-3xl font-bold font-mono mt-1">{formatCurrency(netBalance)}</h3>
                    <span className="text-sm text-white/80 mt-1">
                      (Ingresos - Gastos)
                    </span>
                  </div>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 shadow-inner border border-white/30">
                  {netBalance >= 0 ? (
                    <ArrowUp className="h-8 w-8 text-white" />
                  ) : (
                    <ArrowDown className="h-8 w-8 text-white" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="card-app border-primary/20 overflow-hidden">
              <CardContent className="pt-6 pb-4 relative">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-xl"></div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Saldo total</p>
                    <h3 className="text-2xl font-bold font-mono mt-1">{formatCurrency(totalBalance)}</h3>
                  </div>
                  <div className="bg-primary/10 backdrop-blur-sm rounded-2xl p-3 shadow-sm">
                    <Banknote className="h-6 w-6 text-primary/90" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="card-app border-green-500/20 overflow-hidden">
              <CardContent className="pt-6 pb-4 relative">
                <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full blur-xl"></div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Ingresos ({selectedPeriod === "month" ? "Mes" : "Año"})
                    </p>
                    <h3 className="text-2xl font-bold font-mono mt-1">{formatCurrency(totalIncome)}</h3>
                    <span className="text-green-500 text-sm flex items-center mt-1">
                      <ArrowUp className="h-4 w-4 mr-1" />
                      +{incomeChange}% vs. {selectedPeriod === "month" ? "mes anterior" : "año anterior"}
                    </span>
                  </div>
                  <div className="bg-green-500/10 backdrop-blur-sm rounded-2xl p-3 shadow-sm">
                    <ArrowUp className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="card-app border-red-500/20 overflow-hidden">
              <CardContent className="pt-6 pb-4 relative">
                <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-xl"></div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Gastos ({selectedPeriod === "month" ? "Mes" : "Año"})
                    </p>
                    <h3 className="text-2xl font-bold font-mono mt-1">{formatCurrency(totalExpense)}</h3>
                    <span className="text-red-500 text-sm flex items-center mt-1">
                      <ArrowDown className="h-4 w-4 mr-1" />
                      +{expenseChange}% vs. {selectedPeriod === "month" ? "mes anterior" : "año anterior"}
                    </span>
                  </div>
                  <div className="bg-red-500/10 backdrop-blur-sm rounded-2xl p-3 shadow-sm">
                    <CreditCard className="h-6 w-6 text-red-600" />
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
          <Card className={`card-app relative overflow-hidden border-0 shadow-lg ${
            personalNetBalance >= 0 
              ? 'bg-gradient-to-br from-blue-500/80 to-blue-700 dark:from-blue-500/90 dark:to-blue-700/90' 
              : 'bg-gradient-to-br from-red-500/80 to-red-700 dark:from-red-500/90 dark:to-red-700/90'
          }`}>
            <CardContent className="pt-6 pb-6 text-white">
              {/* Elementos decorativos */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mt-32 -mr-32 opacity-70"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/5 rounded-full blur-2xl"></div>
              
              <div className="flex justify-between items-center relative z-10">
                <div>
                  <p className="text-base font-semibold text-white/90">
                    {selectedPeriod === "month" ? "Saldo personal mensual" : "Saldo personal anual"}
                  </p>
                  <div className="flex flex-col">
                    <h3 className="text-3xl font-bold font-mono mt-1">{formatCurrency(personalNetBalance)}</h3>
                    <span className="text-sm text-white/80 mt-1">
                      (Ingresos - Gastos)
                    </span>
                  </div>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 shadow-inner border border-white/30">
                  {personalNetBalance >= 0 ? (
                    <ArrowUp className="h-8 w-8 text-white" />
                  ) : (
                    <ArrowDown className="h-8 w-8 text-white" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">            
            <Card className="card-app border-green-500/20 overflow-hidden">
              <CardContent className="pt-6 pb-4 relative">
                <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full blur-xl"></div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Ingresos Personales</p>
                    <h3 className="text-2xl font-bold font-mono mt-1">{formatCurrency(personalIncome)}</h3>
                  </div>
                  <div className="bg-green-500/10 backdrop-blur-sm rounded-2xl p-3 shadow-sm">
                    <ArrowUp className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="card-app border-red-500/20 overflow-hidden">
              <CardContent className="pt-6 pb-4 relative">
                <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-xl"></div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Gastos Personales</p>
                    <h3 className="text-2xl font-bold font-mono mt-1">{formatCurrency(personalExpense)}</h3>
                  </div>
                  <div className="bg-red-500/10 backdrop-blur-sm rounded-2xl p-3 shadow-sm">
                    <CreditCard className="h-6 w-6 text-red-600" />
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
          <Card className={`card-app relative overflow-hidden border-0 shadow-lg ${
            householdNetBalance >= 0 
              ? 'bg-gradient-to-br from-purple-500/80 to-purple-700 dark:from-purple-500/90 dark:to-purple-700/90' 
              : 'bg-gradient-to-br from-red-500/80 to-red-700 dark:from-red-500/90 dark:to-red-700/90'
          }`}>
            <CardContent className="pt-6 pb-6 text-white">
              {/* Elementos decorativos */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mt-32 -mr-32 opacity-70"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/5 rounded-full blur-2xl"></div>
              
              <div className="flex justify-between items-center relative z-10">
                <div>
                  <p className="text-base font-semibold text-white/90">
                    {selectedPeriod === "month" ? "Saldo del hogar mensual" : "Saldo del hogar anual"}
                  </p>
                  <div className="flex flex-col">
                    <h3 className="text-3xl font-bold font-mono mt-1">{formatCurrency(householdNetBalance)}</h3>
                    <span className="text-sm text-white/80 mt-1">
                      (Ingresos - Gastos)
                    </span>
                  </div>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 shadow-inner border border-white/30">
                  {householdNetBalance >= 0 ? (
                    <ArrowUp className="h-8 w-8 text-white" />
                  ) : (
                    <ArrowDown className="h-8 w-8 text-white" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">            
            <Card className="card-app border-green-500/20 overflow-hidden">
              <CardContent className="pt-6 pb-4 relative">
                <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full blur-xl"></div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Ingresos del Hogar</p>
                    <h3 className="text-2xl font-bold font-mono mt-1">{formatCurrency(householdIncome)}</h3>
                  </div>
                  <div className="bg-green-500/10 backdrop-blur-sm rounded-2xl p-3 shadow-sm">
                    <ArrowUp className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="card-app border-red-500/20 overflow-hidden">
              <CardContent className="pt-6 pb-4 relative">
                <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-xl"></div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Gastos del Hogar</p>
                    <h3 className="text-2xl font-bold font-mono mt-1">{formatCurrency(householdExpense)}</h3>
                  </div>
                  <div className="bg-red-500/10 backdrop-blur-sm rounded-2xl p-3 shadow-sm">
                    <CreditCard className="h-6 w-6 text-red-600" />
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
