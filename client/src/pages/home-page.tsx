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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
        
        {/* Botones de registro rápido - Estilo App */}
        <div className="mt-6">
          <Card className="card-app overflow-hidden bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary-900/40 dark:to-primary-800/20 border-primary/10 dark:border-primary-700/30">
            <CardContent className="pt-6 pb-6">
              <div className="space-y-4 relative">
                {/* Elemento decorativo */}
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
        
        {/* Financial Summary */}
        <div className="mt-6">
          <FinancialSummary />
        </div>
        
        {/* Monthly Trend Chart - Estilo App */}
        <div className="mt-6">
          <Card className="card-app border-muted/80 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/30">
              <CardTitle className="text-lg font-bold flex items-center">
                <span className="bg-secondary/10 p-1.5 rounded-lg mr-2 flex-shrink-0">
                  <Plus className="h-5 w-5 text-secondary" />
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
                {/* Elementos decorativos */}
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-chart-1/5 rounded-full blur-2xl"></div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-chart-5/5 rounded-full blur-2xl"></div>
                
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
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                    <XAxis dataKey="month" stroke="var(--foreground)" />
                    <YAxis 
                      tickFormatter={(value) => formatCurrency(value).split(",")[0]}
                      stroke="var(--foreground)"
                    />
                    <RechartsTooltip 
                      formatter={(value: any) => formatCurrency(value)} 
                      labelFormatter={(label) => `Mes: ${label}`}
                      contentStyle={{
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        border: '1px solid rgba(0,0,0,0.05)'
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '10px' }} />
                    <Line
                      type="monotone"
                      dataKey="ingresos"
                      stroke="hsl(var(--chart-1))"
                      activeDot={{ r: 8, strokeWidth: 0, fill: 'hsl(var(--chart-1))' }}
                      strokeWidth={3}
                      name="Ingresos"
                      dot={{ fill: 'hsl(var(--chart-1))', r: 4, strokeWidth: 0 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="gastos"
                      stroke="hsl(var(--chart-5))"
                      strokeWidth={3}
                      name="Gastos"
                      dot={{ fill: 'hsl(var(--chart-5))', r: 4, strokeWidth: 0 }}
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
