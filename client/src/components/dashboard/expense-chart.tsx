import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useCurrency } from "@/hooks/use-currency";
import { CategoryIcon } from "@/components/ui/category-icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

// Helper function to get date range for the selected period
function getDateRange(period: string) {
  const today = new Date();
  let startDate = new Date();
  
  if (period === "month") {
    startDate = new Date(today.getFullYear(), today.getMonth(), 1);
  } else if (period === "quarter") {
    startDate = new Date(today.getFullYear(), today.getMonth() - 3, 1);
  } else if (period === "year") {
    startDate = new Date(today.getFullYear(), 0, 1);
  }
  
  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: today.toISOString().split('T')[0]
  };
}

export function ExpenseChart() {
  const [period, setPeriod] = useState("month");
  const { formatCurrency, defaultCurrency } = useCurrency();
  const dateRange = getDateRange(period);
  
  // Fetch categories to get names and colors
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: getQueryFn({ on401: "throw" })
  });
  
  // Fetch transactions for the selected period
  const { data: transactions = [] } = useQuery({
    queryKey: ["/api/transactions", dateRange.startDate, dateRange.endDate, 2], // 2 is the transaction type ID for expenses
    queryFn: getQueryFn({ on401: "throw" })
  });
  
  // Process data for the chart
  const [chartData, setChartData] = useState<any[]>([]);
  
  useEffect(() => {
    if (transactions.length === 0 || categories.length === 0) return;
    
    // Filter expenses
    const expenses = transactions.filter((tx: any) => tx.transactionTypeId === 2);
    
    // Group expenses by category
    const expensesByCategory = expenses.reduce((acc: any, expense: any) => {
      const categoryId = expense.categoryId;
      const amount = parseFloat(expense.amount);
      
      if (!acc[categoryId]) {
        acc[categoryId] = 0;
      }
      
      acc[categoryId] += amount;
      return acc;
    }, {});
    
    // Convert to chart data format
    const chartData = Object.entries(expensesByCategory).map(([categoryId, totalAmount]) => {
      const category = categories.find((cat: any) => cat.id === parseInt(categoryId));
      return {
        name: category ? category.name : "Sin categoría",
        value: totalAmount,
        color: category ? category.color : "#999999",
        icon: category ? category.icon : null,
      };
    });
    
    // Sort by amount (highest first)
    chartData.sort((a, b) => b.value - a.value);
    
    // Calculate percentage of total
    const total = chartData.reduce((sum, item) => sum + item.value, 0);
    chartData.forEach(item => {
      item.percentage = Math.round((item.value / total) * 100);
    });
    
    setChartData(chartData);
  }, [transactions, categories]);
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-md font-medium">Distribución de Gastos</CardTitle>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">Este mes</SelectItem>
            <SelectItem value="quarter">Último trimestre</SelectItem>
            <SelectItem value="year">Este año</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-52">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={70}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => formatCurrency(value)} 
                    labelFormatter={(name) => `Categoría: ${name}`}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No hay datos para mostrar
              </div>
            )}
          </div>
          <div className="space-y-3">
            {chartData.slice(0, 6).map((item, index) => (
              <div key={index} className="flex items-center">
                <CategoryIcon 
                  name={item.name} 
                  icon={item.icon} 
                  color={item.color}
                  size="sm"
                  showEmoji={true}
                  className="mr-2"
                />
                <span className="text-sm text-gray-600 dark:text-gray-300 flex-1">{item.name}</span>
                <span className="text-sm font-semibold">{item.percentage}%</span>
              </div>
            ))}
            {chartData.length > 6 && (
              <div className="flex items-center">
                <CategoryIcon 
                  name="Varios"
                  color="#777777"
                  size="sm"
                  showEmoji={true}
                  className="mr-2"
                />
                <span className="text-sm text-gray-600 dark:text-gray-300 flex-1">Otros</span>
                <span className="text-sm font-semibold">
                  {chartData.slice(6).reduce((sum, item) => sum + item.percentage, 0)}%
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
