import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Shell } from "@/components/layout/shell";
import { PageHeader } from "@/components/layout/page-header";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  LineChart, 
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import { format, subMonths, getMonth, getYear, parse, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { Loader2, Download, BarChart3, PieChart as PieChartIcon, TrendingUp, Target, DollarSign, Calendar as CalendarIcon } from "lucide-react";
import { Transaction, Budget, Category, SavingsGoal } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// Colores para los gráficos
const COLORS = [
  "#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8",
  "#4CAF50", "#F44336", "#9C27B0", "#3F51B5", "#009688",
  "#FF5722", "#795548", "#607D8B", "#E91E63", "#FFC107"
];

// Función para formatear montos
const formatAmount = (amount: string, currency: string = "UYU") => {
  const value = parseFloat(amount);
  return `${currency === "UYU" ? "$" : "US$"} ${value.toLocaleString("es-UY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

// Función para generar datos para el gráfico de distribución por categoría
const getCategoryDistribution = (
  transactions: Transaction[], 
  categories: Category[],
  type: "expense" | "income" = "expense"
) => {
  const typeId = type === "expense" ? 2 : 1; // 1 = ingreso, 2 = gasto
  
  // Filtrar transacciones por tipo
  const filteredTransactions = transactions.filter(t => 
    t.transactionTypeId === typeId
  );
  
  // Agrupar por categoría
  const categoryGroups = filteredTransactions.reduce((acc, transaction) => {
    const { categoryId, amount, currency } = transaction;
    const value = parseFloat(amount);
    
    if (!acc[categoryId]) {
      acc[categoryId] = { 
        value: 0, 
        uy: 0, 
        usd: 0 
      };
    }
    
    if (currency === "USD") {
      acc[categoryId].usd += value;
    } else {
      acc[categoryId].uy += value;
    }
    
    // Usamos UY como moneda principal, pero podrías cambiar esto
    acc[categoryId].value += value * (currency === "USD" ? 38 : 1); // Tipo de cambio estimado
    
    return acc;
  }, {} as Record<number, { value: number, uy: number, usd: number }>);
  
  // Crear el array de datos para el gráfico
  return Object.entries(categoryGroups).map(([categoryId, data]) => {
    const category = categories.find(c => c.id === parseInt(categoryId)) || { 
      name: "Sin categoría", 
      id: parseInt(categoryId) 
    };
    
    return {
      name: category.name,
      value: data.value,
      valueUY: data.uy,
      valueUSD: data.usd,
      id: category.id
    };
  }).sort((a, b) => b.value - a.value);
};

// Función para generar datos para el gráfico de tendencias mensuales
const getMonthlyTrends = (transactions: Transaction[], months: number = 6) => {
  const now = new Date();
  const data = [];
  
  // Crear un array con los últimos X meses
  for (let i = months - 1; i >= 0; i--) {
    const date = subMonths(now, i);
    const monthName = format(date, "MMM", { locale: es });
    const monthYear = format(date, "yyyy-MM");
    const targetMonth = getMonth(date);
    const targetYear = getYear(date);
    
    // Filtrar transacciones para este mes
    const monthTransactions = transactions.filter(t => {
      const transDate = new Date(t.date);
      return getMonth(transDate) === targetMonth && getYear(transDate) === targetYear;
    });
    
    // Calcular ingresos y gastos
    const income = monthTransactions
      .filter(t => t.transactionTypeId === 1)
      .reduce((sum, t) => {
        const value = parseFloat(t.amount);
        // Convertir USD a UYU si es necesario (usando tasa de cambio estimada)
        return sum + value * (t.currency === "USD" ? 38 : 1);
      }, 0);
    
    const expenses = monthTransactions
      .filter(t => t.transactionTypeId === 2)
      .reduce((sum, t) => {
        const value = parseFloat(t.amount);
        return sum + value * (t.currency === "USD" ? 38 : 1);
      }, 0);
    
    data.push({
      month: monthName,
      monthYear,
      income,
      expenses,
      balance: income - expenses
    });
  }
  
  return data;
};

// Función para generar datos para el gráfico de presupuesto vs. gastos reales
const getBudgetComparison = (
  budgets: Budget[], 
  transactions: Transaction[],
  categories: Category[]
) => {
  return budgets.map(budget => {
    const categoryName = categories.find(c => c.id === budget.categoryId)?.name || "Sin categoría";
    const budgetAmount = parseFloat(budget.amount);
    
    // Filtrar transacciones que coinciden con la categoría y son del período actual
    const periodStart = new Date(budget.startDate);
    const currentDate = new Date();
    
    // Determinar si estamos en el período actual
    let isCurrentPeriod = true;
    if (budget.endDate) {
      const periodEnd = new Date(budget.endDate);
      isCurrentPeriod = currentDate <= periodEnd;
    }
    
    // Si no estamos en el período actual, no mostrar gastos (o podríamos mostrar el último período completo)
    let spent = 0;
    
    if (isCurrentPeriod) {
      // Filtrar transacciones por categoría y fecha
      const relevantTransactions = transactions.filter(t => 
        t.categoryId === budget.categoryId && 
        t.transactionTypeId === 2 && // Solo gastos
        new Date(t.date) >= periodStart &&
        new Date(t.date) <= currentDate
      );
      
      // Calcular el gasto total
      spent = relevantTransactions.reduce((sum, t) => {
        const value = parseFloat(t.amount);
        return sum + value * (t.currency === "USD" ? 38 : 1); // Convertir a UYU
      }, 0);
    }
    
    // Calcular el porcentaje gastado
    const percentSpent = Math.min(100, (spent / budgetAmount) * 100);
    
    return {
      id: budget.id,
      name: categoryName,
      budget: budgetAmount,
      spent,
      percentSpent,
      remaining: Math.max(0, budgetAmount - spent),
      currency: budget.currency || "UYU"
    };
  });
};

// Función para generar datos para el gráfico de progreso de metas de ahorro
const getSavingsProgress = (savingsGoals: SavingsGoal[]) => {
  return savingsGoals.map(goal => {
    const target = parseFloat(goal.targetAmount);
    const current = parseFloat(goal.currentAmount || "0");
    const percentComplete = Math.min(100, (current / target) * 100);
    
    return {
      id: goal.id,
      name: goal.name,
      target,
      current,
      percentComplete,
      remaining: Math.max(0, target - current),
      currency: goal.currency || "UYU"
    };
  });
};

// Componente para la vista general de reportes
const OverviewReport = ({ 
  transactions, 
  categories,
  isLoading
}: { 
  transactions: Transaction[], 
  categories: Category[],
  isLoading: boolean
}) => {
  const monthlyData = getMonthlyTrends(transactions);
  const latestMonthData = monthlyData[monthlyData.length - 1] || {
    income: 0,
    expenses: 0,
    balance: 0
  };
  
  // Calcular totales
  const totalIncome = transactions
    .filter(t => t.transactionTypeId === 1) // Solo ingresos
    .reduce((sum, t) => sum + parseFloat(t.amount) * (t.currency === "USD" ? 38 : 1), 0);
  
  const totalExpenses = transactions
    .filter(t => t.transactionTypeId === 2) // Solo gastos
    .reduce((sum, t) => sum + parseFloat(t.amount) * (t.currency === "USD" ? 38 : 1), 0);
  
  const expensesByCategory = getCategoryDistribution(transactions, categories, "expense");
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-green-600 flex items-center">
              <DollarSign className="mr-2 h-5 w-5" />
              Ingresos
            </CardTitle>
            <CardDescription>Total de ingresos registrados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                formatAmount(totalIncome.toString())
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Último mes: {formatAmount(latestMonthData.income.toString())}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-red-600 flex items-center">
              <DollarSign className="mr-2 h-5 w-5" />
              Gastos
            </CardTitle>
            <CardDescription>Total de gastos registrados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                formatAmount(totalExpenses.toString())
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Último mes: {formatAmount(latestMonthData.expenses.toString())}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className={`flex items-center ${totalIncome - totalExpenses >= 0 ? "text-blue-600" : "text-red-600"}`}>
              <DollarSign className="mr-2 h-5 w-5" />
              Balance
            </CardTitle>
            <CardDescription>Diferencia entre ingresos y gastos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                formatAmount((totalIncome - totalExpenses).toString())
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Último mes: {formatAmount(latestMonthData.balance.toString())}
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="mr-2 h-5 w-5" />
              Tendencia mensual
            </CardTitle>
            <CardDescription>Ingresos y gastos de los últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-64 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart
                  data={monthlyData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => [`${formatAmount(value.toString())}`, ""]}
                    labelFormatter={(label) => `Mes: ${label}`}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="income" 
                    stackId="1"
                    name="Ingresos"
                    stroke="#4CAF50" 
                    fill="#4CAF50" 
                    fillOpacity={0.5}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="expenses" 
                    stackId="2"
                    name="Gastos"
                    stroke="#F44336" 
                    fill="#F44336" 
                    fillOpacity={0.5}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChartIcon className="mr-2 h-5 w-5" />
              Distribución por categoría
            </CardTitle>
            <CardDescription>Principales categorías de gastos</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-64 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : expensesByCategory.length === 0 ? (
              <div className="h-64 flex items-center justify-center">
                <p className="text-muted-foreground">No hay datos suficientes</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={expensesByCategory}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {expensesByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [formatAmount(value.toString()), ""]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Componente para el informe de gastos por categoría
const ExpenseByCategoryReport = ({ 
  transactions, 
  categories,
  isLoading
}: { 
  transactions: Transaction[], 
  categories: Category[],
  isLoading: boolean
}) => {
  const [period, setPeriod] = useState("all");
  const [view, setView] = useState("pie");
  
  // Filtrar transacciones por periodo
  const filteredTransactions = transactions.filter(t => {
    if (period === "all") return true;
    
    const transDate = new Date(t.date);
    const now = new Date();
    
    if (period === "month") {
      return (
        getMonth(transDate) === getMonth(now) && 
        getYear(transDate) === getYear(now)
      );
    }
    
    if (period === "3months") {
      const threeMonthsAgo = subMonths(now, 3);
      return transDate >= threeMonthsAgo;
    }
    
    if (period === "6months") {
      const sixMonthsAgo = subMonths(now, 6);
      return transDate >= sixMonthsAgo;
    }
    
    return true;
  });
  
  const expenseData = getCategoryDistribution(filteredTransactions, categories, "expense");
  const incomeData = getCategoryDistribution(filteredTransactions, categories, "income");
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex items-center space-x-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Seleccionar período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo el tiempo</SelectItem>
              <SelectItem value="month">Este mes</SelectItem>
              <SelectItem value="3months">Últimos 3 meses</SelectItem>
              <SelectItem value="6months">Últimos 6 meses</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center bg-muted rounded-md p-1">
            <Button
              variant={view === "pie" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("pie")}
              className="h-8 w-8 p-0"
            >
              <PieChartIcon className="h-4 w-4" />
              <span className="sr-only">Vista de pie</span>
            </Button>
            <Button
              variant={view === "bar" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("bar")}
              className="h-8 w-8 p-0"
            >
              <BarChart3 className="h-4 w-4" />
              <span className="sr-only">Vista de barras</span>
            </Button>
          </div>
        </div>
        <Button variant="outline" size="sm" className="self-start">
          <Download className="mr-2 h-4 w-4" />
          Exportar datos
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Gastos por categoría</CardTitle>
            <CardDescription>
              Distribución de gastos según categoría
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="h-80 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : expenseData.length === 0 ? (
              <div className="h-80 flex items-center justify-center">
                <p className="text-muted-foreground">No hay datos de gastos</p>
              </div>
            ) : view === "pie" ? (
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={expenseData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {expenseData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [formatAmount(value.toString()), ""]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={expenseData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 70, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={60}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatAmount(value.toString()), ""]}
                  />
                  <Legend />
                  <Bar 
                    dataKey="value" 
                    fill="#F44336" 
                    name="Gastos"
                  >
                    {expenseData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
          <CardFooter>
            <div className="w-full">
              <h4 className="font-medium mb-2">Desglose de gastos</h4>
              <div className="space-y-1">
                {expenseData.slice(0, 5).map((item, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                      />
                      <span className="text-sm">{item.name}</span>
                    </div>
                    <span className="text-sm font-medium">
                      {formatAmount(item.value.toString())}
                    </span>
                  </div>
                ))}
                {expenseData.length > 5 && (
                  <div className="text-xs text-muted-foreground text-center pt-1">
                    Y {expenseData.length - 5} categorías más
                  </div>
                )}
              </div>
            </div>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">Ingresos por categoría</CardTitle>
            <CardDescription>
              Distribución de ingresos según categoría
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="h-80 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : incomeData.length === 0 ? (
              <div className="h-80 flex items-center justify-center">
                <p className="text-muted-foreground">No hay datos de ingresos</p>
              </div>
            ) : view === "pie" ? (
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={incomeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {incomeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [formatAmount(value.toString()), ""]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={incomeData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 70, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis 
                    type="category" 
                    dataKey="name"
                    width={60}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatAmount(value.toString()), ""]}
                  />
                  <Legend />
                  <Bar 
                    dataKey="value" 
                    fill="#4CAF50" 
                    name="Ingresos"
                  >
                    {incomeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
          <CardFooter>
            <div className="w-full">
              <h4 className="font-medium mb-2">Desglose de ingresos</h4>
              <div className="space-y-1">
                {incomeData.slice(0, 5).map((item, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                      />
                      <span className="text-sm">{item.name}</span>
                    </div>
                    <span className="text-sm font-medium">
                      {formatAmount(item.value.toString())}
                    </span>
                  </div>
                ))}
                {incomeData.length > 5 && (
                  <div className="text-xs text-muted-foreground text-center pt-1">
                    Y {incomeData.length - 5} categorías más
                  </div>
                )}
              </div>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

// Componente para el informe de tendencias mensuales
const MonthlyTrendsReport = ({ 
  transactions,
  isLoading
}: { 
  transactions: Transaction[],
  isLoading: boolean
}) => {
  const [months, setMonths] = useState("6");
  const [view, setView] = useState("line");
  
  const monthlyData = getMonthlyTrends(transactions, parseInt(months));
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex items-center space-x-2">
          <Select value={months} onValueChange={setMonths}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Últimos 3 meses</SelectItem>
              <SelectItem value="6">Últimos 6 meses</SelectItem>
              <SelectItem value="12">Último año</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center bg-muted rounded-md p-1">
            <Button
              variant={view === "line" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("line")}
              className="h-8 w-8 p-0"
            >
              <TrendingUp className="h-4 w-4" />
              <span className="sr-only">Vista de línea</span>
            </Button>
            <Button
              variant={view === "bar" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("bar")}
              className="h-8 w-8 p-0"
            >
              <BarChart3 className="h-4 w-4" />
              <span className="sr-only">Vista de barras</span>
            </Button>
          </div>
        </div>
        <Button variant="outline" size="sm" className="self-start">
          <Download className="mr-2 h-4 w-4" />
          Exportar datos
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Tendencias mensuales</CardTitle>
          <CardDescription>
            Evolución de ingresos y gastos a lo largo del tiempo
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-80 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : monthlyData.length === 0 ? (
            <div className="h-80 flex items-center justify-center">
              <p className="text-muted-foreground">No hay suficientes datos para mostrar tendencias</p>
            </div>
          ) : view === "line" ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart
                data={monthlyData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => [formatAmount(value.toString()), ""]}
                  labelFormatter={(value) => `Mes: ${value}`}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="income" 
                  name="Ingresos"
                  stroke="#4CAF50" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="expenses" 
                  name="Gastos"
                  stroke="#F44336" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="balance" 
                  name="Balance"
                  stroke="#3F51B5" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={monthlyData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => [formatAmount(value.toString()), ""]}
                  labelFormatter={(value) => `Mes: ${value}`}
                />
                <Legend />
                <Bar 
                  dataKey="income" 
                  name="Ingresos"
                  fill="#4CAF50" 
                  stackId="a"
                />
                <Bar 
                  dataKey="expenses" 
                  name="Gastos"
                  fill="#F44336" 
                  stackId="b"
                />
                <Bar 
                  dataKey="balance" 
                  name="Balance"
                  fill="#3F51B5" 
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
        <CardFooter>
          <div className="w-full">
            <h4 className="font-medium mb-2">Desglose por mes</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {monthlyData.map((item, index) => (
                <div key={index} className="border rounded-md p-2">
                  <div className="font-medium">{item.month}</div>
                  <div className="grid grid-cols-2 gap-x-4 text-sm">
                    <div className="text-muted-foreground">Ingresos:</div>
                    <div className="text-green-600 font-medium">{formatAmount(item.income.toString())}</div>
                    <div className="text-muted-foreground">Gastos:</div>
                    <div className="text-red-600 font-medium">{formatAmount(item.expenses.toString())}</div>
                    <div className="text-muted-foreground">Balance:</div>
                    <div className={item.balance >= 0 ? "text-blue-600 font-medium" : "text-red-600 font-medium"}>
                      {formatAmount(item.balance.toString())}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

// Componente para el informe de presupuestos vs. gastos reales
const BudgetComparisonReport = ({ 
  budgets, 
  transactions,
  categories,
  isLoading
}: { 
  budgets: Budget[],
  transactions: Transaction[],
  categories: Category[],
  isLoading: boolean
}) => {
  const budgetData = getBudgetComparison(budgets, transactions, categories);
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h3 className="text-lg font-medium">Presupuestos vs. Gastos Reales</h3>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Exportar datos
        </Button>
      </div>
      
      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : budgetData.length === 0 ? (
        <div className="p-8 text-center rounded-lg border">
          <h3 className="text-lg font-medium mb-2">No hay presupuestos configurados</h3>
          <p className="text-muted-foreground mb-4">
            Para ver este informe, primero debes crear presupuestos en la sección "Proyectos del Hogar".
          </p>
          <Button>Crear presupuesto</Button>
        </div>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Comparativa visual</CardTitle>
              <CardDescription>
                Gastos actuales comparados con el presupuesto asignado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={budgetData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  barCategoryGap={20}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => [formatAmount(value.toString()), ""]}
                  />
                  <Legend />
                  <Bar 
                    dataKey="budget" 
                    name="Presupuesto" 
                    fill="#3F51B5" 
                  />
                  <Bar 
                    dataKey="spent" 
                    name="Gastado" 
                    fill="#F44336" 
                  />
                  <Bar 
                    dataKey="remaining" 
                    name="Restante" 
                    fill="#4CAF50" 
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {budgetData.map((budget, index) => (
              <Card key={index}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{budget.name}</CardTitle>
                  <CardDescription>
                    Presupuesto: {formatAmount(budget.budget.toString(), budget.currency)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Gastado:</span>
                      <span className="font-medium">
                        {formatAmount(budget.spent.toString(), budget.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Restante:</span>
                      <span className={`font-medium ${budget.remaining > 0 ? "text-green-600" : "text-red-600"}`}>
                        {formatAmount(budget.remaining.toString(), budget.currency)}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${
                          budget.percentSpent > 90 ? "bg-red-600" : 
                          budget.percentSpent > 70 ? "bg-yellow-500" : 
                          "bg-green-600"
                        }`}
                        style={{ width: `${budget.percentSpent}%` }}
                      />
                    </div>
                    <div className="text-xs text-center">
                      {budget.percentSpent.toFixed(0)}% utilizado
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Componente para el informe de progreso en metas de ahorro
const SavingsGoalReport = ({ 
  savingsGoals,
  isLoading
}: { 
  savingsGoals: SavingsGoal[],
  isLoading: boolean
}) => {
  const savingsData = getSavingsProgress(savingsGoals);
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h3 className="text-lg font-medium">Progreso en Metas de Ahorro</h3>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Exportar datos
        </Button>
      </div>
      
      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : savingsData.length === 0 ? (
        <div className="p-8 text-center rounded-lg border">
          <h3 className="text-lg font-medium mb-2">No hay metas de ahorro configuradas</h3>
          <p className="text-muted-foreground mb-4">
            Para ver este informe, primero debes crear metas de ahorro en la sección "Metas de Ahorro".
          </p>
          <Button>Crear meta de ahorro</Button>
        </div>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Resumen gráfico</CardTitle>
              <CardDescription>
                Progreso actual hacia tus metas de ahorro
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={savingsData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  barCategoryGap={20}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => [formatAmount(value.toString()), ""]}
                  />
                  <Legend />
                  <Bar 
                    dataKey="target" 
                    name="Meta" 
                    fill="#3F51B5" 
                  />
                  <Bar 
                    dataKey="current" 
                    name="Actual" 
                    fill="#4CAF50" 
                  />
                  <Bar 
                    dataKey="remaining" 
                    name="Por ahorrar" 
                    fill="#FFC107" 
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {savingsData.map((goal, index) => (
              <Card key={index}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{goal.name}</CardTitle>
                  <CardDescription>
                    Meta: {formatAmount(goal.target.toString(), goal.currency)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Ahorrado:</span>
                      <span className="font-medium">
                        {formatAmount(goal.current.toString(), goal.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Pendiente:</span>
                      <span className="font-medium text-amber-600">
                        {formatAmount(goal.remaining.toString(), goal.currency)}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-600"
                        style={{ width: `${goal.percentComplete}%` }}
                      />
                    </div>
                    <div className="text-xs text-center">
                      {goal.percentComplete.toFixed(0)}% completado
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Componente para selector de fechas
interface DateRangePickerProps {
  startDate: Date | undefined;
  endDate: Date | undefined;
  onStartDateChange: (date: Date | undefined) => void;
  onEndDateChange: (date: Date | undefined) => void;
}

const DateRangePicker = ({ 
  startDate, 
  endDate, 
  onStartDateChange, 
  onEndDateChange 
}: DateRangePickerProps) => {
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-end">
      <div className="grid gap-2">
        <Label htmlFor="start-date">Fecha inicial</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="start-date"
              variant={"outline"}
              className={cn(
                "w-full justify-start text-left font-normal",
                !startDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {startDate ? format(startDate, "PP", { locale: es }) : <span>Selecciona una fecha</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={onStartDateChange}
              initialFocus
              locale={es}
            />
          </PopoverContent>
        </Popover>
      </div>
      
      <div className="grid gap-2">
        <Label htmlFor="end-date">Fecha final</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="end-date"
              variant={"outline"}
              className={cn(
                "w-full justify-start text-left font-normal",
                !endDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {endDate ? format(endDate, "PP", { locale: es }) : <span>Selecciona una fecha</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={endDate}
              onSelect={onEndDateChange}
              initialFocus
              disabled={(date) => startDate ? date < startDate : false}
              locale={es}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();
  
  // Estado para el rango de fechas
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [startDate, setStartDate] = useState<Date | undefined>(firstDayOfMonth);
  const [endDate, setEndDate] = useState<Date | undefined>(today);
  
  // Formateamos las fechas para la consulta
  const startDateParam = startDate ? format(startDate, "yyyy-MM-dd") : undefined;
  const endDateParam = endDate ? format(endDate, "yyyy-MM-dd") : undefined;
  
  // Cargar datos de transacciones
  const { 
    data: transactions = [], 
    isLoading: isLoadingTransactions 
  } = useQuery({
    queryKey: ["/api/transactions", startDateParam, endDateParam],
    queryFn: getQueryFn({ on401: "throw" }),
  });
  
  // Cargar datos de categorías
  const { 
    data: categories = [], 
    isLoading: isLoadingCategories 
  } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: getQueryFn({ on401: "throw" }),
  });
  
  // Cargar datos de presupuestos
  const { 
    data: budgets = [], 
    isLoading: isLoadingBudgets 
  } = useQuery({
    queryKey: ["/api/budgets"],
    queryFn: getQueryFn({ on401: "throw" }),
  });
  
  // Cargar datos de metas de ahorro
  const { 
    data: savingsGoals = [], 
    isLoading: isLoadingSavingsGoals 
  } = useQuery({
    queryKey: ["/api/savings-goals"],
    queryFn: getQueryFn({ on401: "throw" }),
  });
  
  const isLoading = 
    isLoadingTransactions || 
    isLoadingCategories || 
    isLoadingBudgets || 
    isLoadingSavingsGoals;
  
  return (
    <Shell>
      <PageHeader
        title="Reportes"
        description="Analiza tus finanzas personales y familiares"
      />
      
      <div className="bg-card/50 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold mb-2">Filtrar por rango de fechas</h3>
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
        />
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <TabsTrigger value="overview" className="flex items-center">
            <BarChart3 className="mr-2 h-4 w-4" />
            <span className="hidden md:inline">Resumen</span>
            <span className="md:hidden">Resumen</span>
          </TabsTrigger>
          <TabsTrigger value="by-category" className="flex items-center">
            <PieChartIcon className="mr-2 h-4 w-4" />
            <span className="hidden md:inline">Por Categoría</span>
            <span className="md:hidden">Categorías</span>
          </TabsTrigger>
          <TabsTrigger value="monthly-trends" className="flex items-center">
            <TrendingUp className="mr-2 h-4 w-4" />
            <span className="hidden md:inline">Tendencias Mensuales</span>
            <span className="md:hidden">Tendencias</span>
          </TabsTrigger>
          <TabsTrigger value="budget-comparison" className="flex items-center">
            <DollarSign className="mr-2 h-4 w-4" />
            <span className="hidden md:inline">Presupuestos</span>
            <span className="md:hidden">Presupuestos</span>
          </TabsTrigger>
          <TabsTrigger value="savings-goals" className="flex items-center">
            <Target className="mr-2 h-4 w-4" />
            <span className="hidden md:inline">Metas de Ahorro</span>
            <span className="md:hidden">Metas</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <OverviewReport 
            transactions={transactions} 
            categories={categories}
            isLoading={isLoading}
          />
        </TabsContent>
        
        <TabsContent value="by-category" className="space-y-4">
          <ExpenseByCategoryReport 
            transactions={transactions} 
            categories={categories}
            isLoading={isLoading}
          />
        </TabsContent>
        
        <TabsContent value="monthly-trends" className="space-y-4">
          <MonthlyTrendsReport 
            transactions={transactions}
            isLoading={isLoading}
          />
        </TabsContent>
        
        <TabsContent value="budget-comparison" className="space-y-4">
          <BudgetComparisonReport 
            budgets={budgets}
            transactions={transactions}
            categories={categories}
            isLoading={isLoading}
          />
        </TabsContent>
        
        <TabsContent value="savings-goals" className="space-y-4">
          <SavingsGoalReport 
            savingsGoals={savingsGoals}
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>
    </Shell>
  );
}