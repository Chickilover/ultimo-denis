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
  
  // Prepare data for the monthly trend chart
  const generateMonthlyData = (months: number) => {
    const data = [];
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    for (let i = months - 1; i >= 0; i--) {
      const month = (currentMonth - i + 12) % 12;
      const year = currentYear - Math.floor((currentMonth - i + 1) / 12);
      
      // Use Spanish month names
      const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
      
      data.push({
        month: `${monthNames[month]} ${year !== currentYear ? year : ""}`,
        ingresos: 70000 + Math.random() * 20000,
        gastos: 55000 + Math.random() * 15000,
      });
    }
    
    return data;
  };
  
  const [chartData, setChartData] = useState(generateMonthlyData(6));
  
  // Update chart data when period changes
  useEffect(() => {
    const months = chartPeriod === "6months" ? 6 : chartPeriod === "12months" ? 12 : 3;
    setChartData(generateMonthlyData(months));
  }, [chartPeriod]);
  
  return (
    <Shell>
      <div className="container px-4 py-6 max-w-7xl">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">¡Hola, {user?.name || "Usuario"}!</h2>
          <div className="flex items-center space-x-3">
            <Select
              defaultValue="UYU"
              // This would be connected to the currency context in a full implementation
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Moneda" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UYU">$U (UYU)</SelectItem>
                <SelectItem value="USD">$ (USD)</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
