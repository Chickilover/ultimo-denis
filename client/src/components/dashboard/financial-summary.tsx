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
  }, [accounts, defaultCurrency]);
  
  const { totalIncome, totalExpense } = useMemo(() => {
    return transactions.reduce((totals: { totalIncome: number, totalExpense: number }, tx: any) => {
      const amount = parseFloat(tx.amount);
      
      // Convert to default currency if needed
      const convertedAmount = tx.currency === defaultCurrency 
        ? amount 
        : (defaultCurrency === "UYU" 
            ? amount * 40 // USD to UYU
            : amount / 40  // UYU to USD
          );
      
      if (tx.transactionTypeId === 1) { // Income
        totals.totalIncome += convertedAmount;
      } else if (tx.transactionTypeId === 2) { // Expense
        totals.totalExpense += convertedAmount;
      }
      
      return totals;
    }, { totalIncome: 0, totalExpense: 0 });
  }, [transactions, defaultCurrency]);
  
  // Calculate monthly change percentages
  const incomeChange = 5.0;  // Mock values - would calculate by comparing with previous period
  const expenseChange = 8.2;
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Resumen Financiero</h2>
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Seleccionar período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">Mes actual</SelectItem>
            <SelectItem value="year">Año actual</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
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
    </div>
  );
}
