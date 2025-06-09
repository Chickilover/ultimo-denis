import { useState, useEffect } from "react";
import { useQuery, type QueryKey } from "@tanstack/react-query"; // Import QueryKey
import { getQueryFn } from "@/lib/queryClient";
import { useCurrency } from "@/hooks/use-currency";
import { useAuth } from "@/hooks/use-auth";
import { Shell } from "@/components/layout/shell";
import { FinancialSummary } from "@/components/dashboard/financial-summary";
import { ExpenseChart } from "@/components/dashboard/expense-chart";
import { BudgetProgress } from "@/components/dashboard/budget-progress";
import { SavingsGoals } from "@/components/dashboard/savings-goals";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { Advisor } from "@/components/dashboard/advisor";
import { NewTransactionButton } from "@/components/dashboard/new-transaction-button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
// Tooltip components are imported but not directly used in this file, they might be used by child components.
// import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Transaction, Category } from "@shared/schema"; // Import necessary types

// Define the structure for chart data items
interface MonthlyChartData {
  month: string;
  monthIndex: number;
  year: number;
  ingresos: number;
  gastos: number;
}

export default function HomePage() {
  const { user } = useAuth(); // user is of type User | null | undefined from useAuth
  const { formatCurrency } = useCurrency();
  const [chartPeriod, setChartPeriod] = useState("6months");
  
  // Obtener transacciones reales
  const { data: transactionsData = [], isLoading: transactionsLoading, error: transactionsError } = useQuery<Transaction[], Error, Transaction[], QueryKey>({
    queryKey: ["/api/transactions"], // QueryKey type will infer this as string[]
    queryFn: getQueryFn({ on401: "throw" }),
    initialData: [], // Ensure transactionsData is always an array
  });

  // Note: Categories are not directly fetched in home-page.tsx but likely in ExpenseChart or other children.
  // If they were fetched here, it would look like:
  // const { data: categoriesData = [] } = useQuery<Category[], Error>({
  //   queryKey: ["/api/categories"],
  //   queryFn: getQueryFn({ on401: "throw" }),
  //   initialData: [],
  // });
  
  // Preparar datos para el gráfico basados en transacciones reales
  const generateMonthlyData = (months: number): MonthlyChartData[] => {
    const data: MonthlyChartData[] = [];
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

    for (let i = months - 1; i >= 0; i--) {
      let month = currentMonth - i;
      let year = currentYear;
      if (month < 0) {
        month += 12;
        year -= 1;
      }
      
      data.push({
        month: `${monthNames[month]} ${year !== currentYear ? year.toString().slice(-2) : ""}`.trim(), // e.g., "Ene", "Dic 23"
        monthIndex: month,
        year: year,
        ingresos: 0,
        gastos: 0,
      });
    }
    
    transactionsData.forEach((transaction: Transaction) => {
      const transactionDate = new Date(transaction.date); // transaction.date is string | Date
      const transactionMonth = transactionDate.getMonth();
      const transactionYear = transactionDate.getFullYear();
      
      const monthItem = data.find(
        item => item.monthIndex === transactionMonth && item.year === transactionYear
      );
      
      if (monthItem) {
        const amount = parseFloat(transaction.amount); // transaction.amount is string
        if (transaction.transactionTypeId === 1) { // Ingreso
          monthItem.ingresos += amount;
        } else if (transaction.transactionTypeId === 2) { // Gasto
          monthItem.gastos += amount;
        }
      }
    });
    
    return data;
  };
  
  const [chartData, setChartData] = useState<MonthlyChartData[]>([]);
  
  useEffect(() => {
    const months = chartPeriod === "6months" ? 6 : chartPeriod === "12months" ? 12 : 3;
    if (transactionsData.length > 0 || !transactionsLoading) { // Generate data if transactions loaded or finished loading (even if empty)
        setChartData(generateMonthlyData(months));
    }
  }, [chartPeriod, transactionsData, transactionsLoading]); // Add transactionsLoading to dependencies
  
  if (transactionsLoading) {
    // TODO: Add a proper loading skeleton or spinner for the whole page or relevant sections
    return <Shell>Cargando datos del dashboard...</Shell>;
  }

  if (transactionsError) {
    return <Shell>Error al cargar las transacciones: {transactionsError.message}</Shell>;
  }

  return (
    <Shell>
      <div className="container px-4 py-6 max-w-7xl">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">¡Hola, {user?.name || "Usuario"}!</h2>
        </div>
        
        <div className="mt-6">
          <Card className="card-app overflow-hidden bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary-900/40 dark:to-primary-800/20 border-primary/10 dark:border-primary-700/30">
            <CardContent className="pt-6 pb-6">
              <div className="space-y-4 relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl opacity-50 -mt-10 -mr-10"></div>
                <h3 className="text-lg font-bold flex items-center relative z-10">
                  <span className="bg-primary shadow-sm p-2.5 rounded-full mr-3 flex-shrink-0">
                    <Plus className="h-5 w-5 text-white" />
                  </span>
                  Registro rápido de transacciones
                </h3>
                <NewTransactionButton className="relative z-10" />
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="mt-6">
          {/* FinancialSummary might use transactions internally or via context */}
          <FinancialSummary />
        </div>
        
        <div className="mt-6">
          <Card className="card-app border-muted/80 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/30">
              <CardTitle className="text-lg font-bold flex items-center">
                <span className="bg-secondary/10 p-1.5 rounded-lg mr-2 flex-shrink-0">
                  {/* Using Plus as a placeholder icon, consider changing if another fits better */}
                  <LineChart className="h-5 w-5 text-secondary" />
                </span>
                Evolución Mensual
              </CardTitle>
              <Select value={chartPeriod} onValueChange={setChartPeriod}>
                <SelectTrigger className="w-[180px] rounded-lg border-border/50">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3months">Últimos 3 meses</SelectItem>
                  <SelectItem value="6months">Últimos 6 meses</SelectItem>
                  <SelectItem value="12months">Últimos 12 meses</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="h-72 relative">
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-chart-1/5 rounded-full blur-2xl opacity-50"></div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-chart-5/5 rounded-full blur-2xl opacity-50"></div>
                
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--foreground))" />
                    <YAxis 
                      tickFormatter={(value) => formatCurrency(value).split(",")[0]} // Assuming formatCurrency handles number
                      stroke="hsl(var(--foreground))"
                    />
                    <RechartsTooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      labelFormatter={(label: string) => `Mes: ${label}`}
                      contentStyle={{
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px hsla(var(--shadow-color), 0.1)',
                        border: '1px solid hsl(var(--border))',
                        backgroundColor: 'hsl(var(--background))'
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '10px' }} />
                    <Line type="monotone" dataKey="ingresos" stroke="hsl(var(--chart-1))" activeDot={{ r: 8 }} strokeWidth={2} name="Ingresos" dot={{ r: 3 }}/>
                    <Line type="monotone" dataKey="gastos" stroke="hsl(var(--chart-5))" activeDot={{ r: 8 }} strokeWidth={2} name="Gastos" dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* ExpenseChart likely fetches its own data or receives it via context/props */}
          {/* If it needs transactionsData or categoriesData, pass them here */}
          <ExpenseChart transactions={transactionsData} />
          <BudgetProgress />
        </div>
        
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Pass typed transactionsData to RecentTransactions */}
          <RecentTransactions transactions={transactionsData} />
          <SavingsGoals />
        </div>
        
        <div className="mt-6">
          <Advisor />
        </div>
      </div>
    </Shell>
  );
}
