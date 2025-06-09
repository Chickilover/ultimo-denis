import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query"; // QueryKey typically not needed for direct import unless used as a type elsewhere explicitly
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
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from "recharts";
import type { Transaction, Category } from "@shared/schema";
import { Loader2 } from "lucide-react";

// Helper function to get date range for the selected period
function getDateRange(period: string): { startDate: string; endDate: string } {
  const today = new Date();
  let startDate = new Date();
  
  if (period === "month") {
    startDate = new Date(today.getFullYear(), today.getMonth(), 1);
  } else if (period === "quarter") {
    const currentQuarter = Math.floor(today.getMonth() / 3);
    startDate = new Date(today.getFullYear(), currentQuarter * 3, 1);
  } else if (period === "year") {
    startDate = new Date(today.getFullYear(), 0, 1);
  }
  
  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: today.toISOString().split('T')[0]
  };
}

interface ChartDataItem {
  name: string;
  value: number;
  color: string;
  icon: string | null;
  percentage: number;
}

const categoriesQueryKey = ["/api/categories"] as const;

export function ExpenseChart() {
  const [period, setPeriod] = useState("month");
  const { formatCurrency } = useCurrency();
  const dateRange = getDateRange(period);
  
  const { data: categoriesData = [], isLoading: categoriesLoading, isError: categoriesError } = useQuery<Category[], Error, Category[], typeof categoriesQueryKey>({
    queryKey: categoriesQueryKey,
    queryFn: getQueryFn({ on401: "throw" }),
    initialData: [],
  });
  
  const transactionsQueryKey = ["/api/transactions", {
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    transactionTypeId: '2'
  }] as const; // Use "as const" for precise queryKey typing

  const { data: transactionsData = [], isLoading: transactionsLoading, isError: transactionsErrorFetch } = useQuery<Transaction[], Error, Transaction[], typeof transactionsQueryKey>({
    queryKey: transactionsQueryKey,
    queryFn: getQueryFn({ on401: "throw" }), // Corrected: remove wrapper
    initialData: [],
    enabled: !!categoriesData && categoriesData.length > 0,
  });
  
  const [chartData, setChartData] = useState<ChartDataItem[]>([]);
  
  useEffect(() => {
    if (transactionsData.length === 0 || categoriesData.length === 0) {
      setChartData([]);
      return;
    }
    
    const expenses = transactionsData; // Assuming transactionsData are already expenses based on queryKey

    const expensesByCategory = expenses.reduce((acc: Record<number, number>, expense: Transaction) => {
      const categoryId = expense.categoryId;
      const amount = parseFloat(expense.amount);
      
      if (!acc[categoryId]) {
        acc[categoryId] = 0;
      }
      acc[categoryId] += amount;
      return acc;
    }, {});
    
    const processedChartData: ChartDataItem[] = Object.entries(expensesByCategory).map(([categoryIdStr, totalAmount]) => {
      const categoryId = parseInt(categoryIdStr);
      const category = categoriesData.find((cat: Category) => cat.id === categoryId);
      return {
        name: category ? category.name : "Sin categoría",
        value: totalAmount,
        color: category ? category.color : "#999999",
        icon: category ? category.icon : null,
        percentage: 0,
      };
    });
    
    processedChartData.sort((a, b) => b.value - a.value);
    
    const totalExpenses = processedChartData.reduce((sum, item) => sum + item.value, 0);
    
    const finalChartData = processedChartData.map(item => ({
      ...item,
      percentage: totalExpenses > 0 ? Math.round((item.value / totalExpenses) * 100) : 0,
    }));

    setChartData(finalChartData);
  }, [transactionsData, categoriesData]);

  const isLoading = categoriesLoading || transactionsLoading;
  const isError = categoriesError || transactionsErrorFetch;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-md font-medium">Distribución de Gastos</CardTitle>
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardHeader>
        <CardContent className="h-[208px] flex items-center justify-center">
          <p className="text-muted-foreground">Cargando datos...</p>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
     return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-md font-medium">Distribución de Gastos</CardTitle>
        </CardHeader>
        <CardContent className="h-[208px] flex items-center justify-center">
          <p className="text-red-500">Error al cargar los datos del gráfico.</p>
        </CardContent>
      </Card>
    );
  }
  
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
            <SelectItem value="quarter">Trimestre actual</SelectItem>
            <SelectItem value="year">Este año</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
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
                    innerRadius={30}
                    fill="#8884d8"
                    dataKey="value"
                    paddingAngle={2}
                  >
                    {chartData.map((entry: ChartDataItem, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value: number, name: string, props: {payload: ChartDataItem}) => [`${formatCurrency(value)} (${props.payload.percentage}%)`, name]}
                    contentStyle={{
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px hsla(var(--shadow-color), 0.1)',
                        border: '1px solid hsl(var(--border))',
                        backgroundColor: 'hsl(var(--background))'
                      }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <p>No hay gastos en este período.</p>
              </div>
            )}
          </div>
          <div className="space-y-2 max-h-52 overflow-y-auto pr-2">
            {chartData.slice(0, 6).map((item: ChartDataItem, index: number) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <CategoryIcon
                    name={item.name}
                    icon={item.icon}
                    color={item.color}
                    size="sm"
                    showEmoji={true}
                    className="mr-2 flex-shrink-0"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-300 truncate" title={item.name}>{item.name}</span>
                </div>
                <span className="text-sm font-semibold whitespace-nowrap">{item.percentage}%</span>
              </div>
            ))}
            {chartData.length > 6 && (
              <div className="flex items-center justify-between">
                 <div className="flex items-center">
                    <CategoryIcon
                        name="Otros"
                        icon={null}
                        color="#777777"
                        size="sm"
                        showEmoji={true}
                        className="mr-2 flex-shrink-0"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-300 flex-1">Otros</span>
                </div>
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
