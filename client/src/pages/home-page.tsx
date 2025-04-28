import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function HomePage() {
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  const [chartPeriod, setChartPeriod] = useState("6months");
  
  // Obtener transacciones reales
  const { data: transactions = [] } = useQuery<any[]>({
    queryKey: ["/api/transactions"],
    queryFn: getQueryFn({ on401: "throw" }),
  });
  
  // Preparar datos para el gráfico basados en transacciones reales
  const generateMonthlyData = (months: number) => {
    const data = [];
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Inicializar el arreglo con meses vacíos
    for (let i = months - 1; i >= 0; i--) {
      const month = (currentMonth - i + 12) % 12;
      const year = currentYear - Math.floor((currentMonth - i + 1) / 12);
      
      // Nombres de meses en español
      const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
      
      data.push({
        month: `${monthNames[month]} ${year !== currentYear ? year : ""}`,
        monthIndex: month,
        year: year,
        ingresos: 0,
        gastos: 0,
      });
    }
    
    // Calcular ingresos y gastos por mes usando transacciones reales
    transactions.forEach((transaction: any) => {
      const transactionDate = new Date(transaction.date);
      const transactionMonth = transactionDate.getMonth();
      const transactionYear = transactionDate.getFullYear();
      
      // Verificar si la transacción está dentro del rango de meses solicitado
      const monthItem = data.find(
        item => item.monthIndex === transactionMonth && item.year === transactionYear
      );
      
      if (monthItem) {
        const amount = parseFloat(transaction.amount);
        if (transaction.transactionTypeId === 1) { // Ingreso
          monthItem.ingresos += amount;
        } else if (transaction.transactionTypeId === 2) { // Gasto
          monthItem.gastos += amount;
        }
      }
    });
    
    return data;
  };
  
  const [chartData, setChartData] = useState<any[]>([]);
  
  // Actualizar datos del gráfico cuando cambia el periodo o las transacciones
  useEffect(() => {
    const months = chartPeriod === "6months" ? 6 : chartPeriod === "12months" ? 12 : 3;
    setChartData(generateMonthlyData(months));
  }, [chartPeriod, transactions]);
  
  return (
    <Shell>
      <div className="container px-4 py-6 max-w-7xl">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">¡Hola, {user?.name || "Usuario"}!</h2>
        </div>
        
        {/* Botones de registro rápido */}
        <div className="mt-6">
          <Card className="bg-primary-50 dark:bg-primary-950/30 border-primary-100 dark:border-primary-900/50">
            <CardContent className="pt-6 pb-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Registro rápido de transacciones</h3>
                <p className="text-sm text-muted-foreground">
                  Registra tus ingresos y gastos rápidamente, separando entre personal y hogar.
                </p>
                <NewTransactionButton />
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Financial Summary */}
        <div className="mt-6">
          <FinancialSummary />
        </div>
        
        {/* Monthly Trend Chart */}
        <div className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-md font-medium">Evolución Mensual</CardTitle>
              <Select value={chartPeriod} onValueChange={setChartPeriod}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3months">Últimos 3 meses</SelectItem>
                  <SelectItem value="6months">Últimos 6 meses</SelectItem>
                  <SelectItem value="12months">Últimos 12 meses</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis 
                      tickFormatter={(value) => formatCurrency(value).split(",")[0]}
                    />
                    <Tooltip 
                      formatter={(value: any) => formatCurrency(value)} 
                      labelFormatter={(label) => `Mes: ${label}`}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="ingresos"
                      stroke="#3B82F6"
                      activeDot={{ r: 8 }}
                      strokeWidth={2}
                      name="Ingresos"
                    />
                    <Line
                      type="monotone"
                      dataKey="gastos"
                      stroke="#EF4444"
                      strokeWidth={2}
                      name="Gastos"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Expense Breakdown & Budget Status */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <ExpenseChart />
          <BudgetProgress />
        </div>
        
        {/* Recent Transactions & Savings */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <RecentTransactions />
          <SavingsGoals />
        </div>
        
        {/* IA Advisor Section */}
        <div className="mt-6">
          <Advisor />
        </div>
      </div>
    </Shell>
  );
}
