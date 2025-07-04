import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Shell } from "@/components/layout/shell";
import { PageHeader } from "@/components/layout/page-header";
import { getQueryFn } from "@/lib/queryClient";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";

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
  transactions: any[], 
  categories: any[],
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
  transactions: any[], 
  categories: any[],
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
      <Card>
        <CardHeader>
          <CardTitle>Distribución por Categoría</CardTitle>
          <CardDescription>Distribución de ingresos y gastos por categoría</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4">
            <div className="flex items-center space-x-2">
              <Label>Período:</Label>
              <select 
                className="rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={period} 
                onChange={(e) => setPeriod(e.target.value)}
              >
                <option value="month">Este mes</option>
                <option value="3months">Últimos 3 meses</option>
                <option value="6months">Últimos 6 meses</option>
                <option value="all">Todo el tiempo</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <Label>Vista:</Label>
              <div className="flex items-center space-x-1 rounded-md bg-muted p-1">
                <Button
                  variant={view === "pie" ? "default" : "ghost"}
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => setView("pie")}
                >
                  <PieChartIcon className="h-4 w-4" />
                  <span className="ml-1">Gráfico de torta</span>
                </Button>
                <Button
                  variant={view === "bar" ? "default" : "ghost"}
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => setView("bar")}
                >
                  <BarChart3 className="h-4 w-4" />
                  <span className="ml-1">Gráfico de barras</span>
                </Button>
              </div>
            </div>
          </div>
          
          <div className="mb-8">
            <h3 className="font-semibold mb-2 text-red-600">Gastos</h3>
            {isLoading ? (
              <div className="h-64 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : expenseData.length === 0 ? (
              <div className="h-32 flex items-center justify-center">
                <p className="text-muted-foreground">No hay datos de gastos para mostrar</p>
              </div>
            ) : view === "pie" ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
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
              </div>
            ) : (
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={expenseData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={150} />
                    <Tooltip 
                      formatter={(value: number) => [formatAmount(value.toString()), ""]}
                    />
                    <Legend />
                    <Bar dataKey="value" name="Monto" fill="#F44336" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          
          <div>
            <h3 className="font-semibold mb-2 text-green-600">Ingresos</h3>
            {isLoading ? (
              <div className="h-64 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : incomeData.length === 0 ? (
              <div className="h-32 flex items-center justify-center">
                <p className="text-muted-foreground">No hay datos de ingresos para mostrar</p>
              </div>
            ) : view === "pie" ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
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
              </div>
            ) : (
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={incomeData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={150} />
                    <Tooltip 
                      formatter={(value: number) => [formatAmount(value.toString()), ""]}
                    />
                    <Legend />
                    <Bar dataKey="value" name="Monto" fill="#4CAF50" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Componente para el informe de tendencias mensuales
const MonthlyTrendsReport = ({ 
  transactions,
  isLoading
}: { 
  transactions: any[],
  isLoading: boolean
}) => {
  const [months, setMonths] = useState(6);
  const [view, setView] = useState("area");
  
  const monthlyData = getMonthlyTrends(transactions, months);
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Tendencias Mensuales</CardTitle>
          <CardDescription>Evolución de ingresos y gastos en el tiempo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4">
            <div className="flex items-center space-x-2">
              <Label>Meses a mostrar:</Label>
              <select 
                className="rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={months} 
                onChange={(e) => setMonths(parseInt(e.target.value))}
              >
                <option value="3">3 meses</option>
                <option value="6">6 meses</option>
                <option value="12">12 meses</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <Label>Vista:</Label>
              <div className="flex items-center space-x-1 rounded-md bg-muted p-1">
                <Button
                  variant={view === "area" ? "default" : "ghost"}
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => setView("area")}
                >
                  <TrendingUp className="h-4 w-4" />
                  <span className="ml-1">Área</span>
                </Button>
                <Button
                  variant={view === "bar" ? "default" : "ghost"}
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => setView("bar")}
                >
                  <BarChart3 className="h-4 w-4" />
                  <span className="ml-1">Barras</span>
                </Button>
              </div>
            </div>
          </div>
          
          <div className="h-96">
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : monthlyData.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-muted-foreground">No hay datos suficientes para mostrar</p>
              </div>
            ) : view === "area" ? (
              <ResponsiveContainer width="100%" height="100%">
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
                    name="Ingresos"
                    stroke="#4CAF50" 
                    fill="#4CAF50" 
                    fillOpacity={0.5}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="expenses" 
                    name="Gastos"
                    stroke="#F44336" 
                    fill="#F44336" 
                    fillOpacity={0.5}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="balance" 
                    name="Balance"
                    stroke="#2196F3" 
                    fill="#2196F3" 
                    fillOpacity={0.5}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
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
                  <Bar dataKey="income" name="Ingresos" fill="#4CAF50" />
                  <Bar dataKey="expenses" name="Gastos" fill="#F44336" />
                  <Bar dataKey="balance" name="Balance" fill="#2196F3" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Componente para el informe de presupuesto vs. gastos reales
const BudgetComparisonReport = ({ 
  budgets,
  transactions,
  categories,
  isLoading
}: { 
  budgets: any[],
  transactions: any[],
  categories: any[],
  isLoading: boolean
}) => {
  const budgetData = getBudgetComparison(budgets, transactions, categories);
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Comparación de Presupuestos</CardTitle>
          <CardDescription>Análisis de presupuestos vs. gastos reales</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : budgetData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">No hay presupuestos definidos</p>
              <Button variant="outline">
                Crear Presupuesto
              </Button>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={budgetData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: number) => [`${formatAmount(value.toString())}`, ""]}
                    />
                    <Legend />
                    <Bar dataKey="budget" name="Presupuesto" fill="#3F51B5" />
                    <Bar dataKey="spent" name="Gasto real" fill="#F44336" />
                    <Bar dataKey="remaining" name="Restante" fill="#4CAF50" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {budgetData.map((budget) => (
                  <Card key={budget.id} className="border-l-4 hover:shadow-md transition-shadow" style={{ borderLeftColor: budget.spent > budget.budget ? '#F44336' : '#4CAF50' }}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{budget.name}</CardTitle>
                      <CardDescription>
                        {formatAmount(budget.budget.toString(), budget.currency)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Gasto actual:</span>
                          <span className="font-medium">{formatAmount(budget.spent.toString(), budget.currency)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Restante:</span>
                          <span className="font-medium">{formatAmount(budget.remaining.toString(), budget.currency)}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${budget.spent > budget.budget ? 'bg-red-500' : 'bg-green-500'}`}
                            style={{ width: `${budget.percentSpent}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-end text-muted-foreground">
                          {budget.percentSpent.toFixed(0)}% utilizado
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Componente para el informe de metas de ahorro
const SavingsGoalReport = ({ 
  savingsGoals,
  isLoading
}: { 
  savingsGoals: any[],
  isLoading: boolean
}) => {
  const savingsData = getSavingsProgress(savingsGoals);
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Metas de Ahorro</CardTitle>
          <CardDescription>Progreso en tus metas de ahorro</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : savingsData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">No hay metas de ahorro definidas</p>
              <Button variant="outline">
                Crear Meta de Ahorro
              </Button>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                {savingsData.map((goal) => (
                  <Card key={goal.id} className="hover:shadow-md transition-shadow">
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
                          <span className="font-medium">{formatAmount(goal.current.toString(), goal.currency)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Restante:</span>
                          <span className="font-medium">{formatAmount(goal.remaining.toString(), goal.currency)}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500"
                            style={{ width: `${goal.percentComplete}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-end text-muted-foreground">
                          {goal.percentComplete.toFixed(0)}% completado
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={savingsData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: number) => [`${formatAmount(value.toString())}`, ""]}
                    />
                    <Legend />
                    <Bar dataKey="target" name="Meta" fill="#3F51B5" />
                    <Bar dataKey="current" name="Ahorrado" fill="#4CAF50" />
                    <Bar dataKey="remaining" name="Restante" fill="#FFC107" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

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
    <div className="flex flex-col sm:flex-row gap-2 items-end">
      <div className="grid gap-1.5 w-full">
        <Label htmlFor="start-date" className="text-xs">Desde</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="start-date"
              variant={"outline"}
              size="sm"
              className={cn(
                "w-full justify-start text-left font-normal",
                !startDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-3.5 w-3.5" />
              {startDate ? format(startDate, "PP", { locale: es }) : <span>Inicio</span>}
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
      
      <div className="grid gap-1.5 w-full">
        <Label htmlFor="end-date" className="text-xs">Hasta</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="end-date"
              variant={"outline"}
              size="sm"
              className={cn(
                "w-full justify-start text-left font-normal",
                !endDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-3.5 w-3.5" />
              {endDate ? format(endDate, "PP", { locale: es }) : <span>Fin</span>}
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
    data: transactions = [] as Transaction[], 
    isLoading: isLoadingTransactions 
  } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions", startDateParam, endDateParam],
    queryFn: getQueryFn({ on401: "throw" }),
  });
  
  // Cargar datos de categorías
  const { 
    data: categories = [] as Category[], 
    isLoading: isLoadingCategories 
  } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    queryFn: getQueryFn({ on401: "throw" }),
  });
  
  // Cargar datos de presupuestos
  const { 
    data: budgets = [] as Budget[], 
    isLoading: isLoadingBudgets 
  } = useQuery<Budget[]>({
    queryKey: ["/api/budgets"],
    queryFn: getQueryFn({ on401: "throw" }),
  });
  
  // Cargar datos de metas de ahorro
  const { 
    data: savingsGoals = [] as SavingsGoal[], 
    isLoading: isLoadingSavingsGoals 
  } = useQuery<SavingsGoal[]>({
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
      
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="w-full md:w-3/4">
          <div className="grid w-full grid-cols-2 md:grid-cols-4 gap-1 bg-muted rounded-md p-1">
            <Button 
              variant={activeTab === "overview" ? "default" : "ghost"}
              className="flex items-center justify-center"
              onClick={() => setActiveTab("overview")}
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              <span className="hidden md:inline">Resumen</span>
              <span className="md:hidden">Resumen</span>
            </Button>
            <Button 
              variant={activeTab === "by-category" ? "default" : "ghost"}
              className="flex items-center justify-center"
              onClick={() => setActiveTab("by-category")}
            >
              <PieChartIcon className="mr-2 h-4 w-4" />
              <span className="hidden md:inline">Por Categoría</span>
              <span className="md:hidden">Categorías</span>
            </Button>
            <Button 
              variant={activeTab === "monthly-trends" ? "default" : "ghost"}
              className="flex items-center justify-center"
              onClick={() => setActiveTab("monthly-trends")}
            >
              <TrendingUp className="mr-2 h-4 w-4" />
              <span className="hidden md:inline">Tendencias</span>
              <span className="md:hidden">Tendencias</span>
            </Button>
            <Button 
              variant={activeTab === "budget-comparison" ? "default" : "ghost"}
              className="flex items-center justify-center"
              onClick={() => setActiveTab("budget-comparison")}
            >
              <DollarSign className="mr-2 h-4 w-4" />
              <span className="hidden md:inline">Presupuestos</span>
              <span className="md:hidden">Presupuestos</span>
            </Button>
          </div>
        </div>
        
        <div className="w-full md:w-1/4 bg-card rounded-lg p-3">
          <h3 className="text-sm font-medium mb-2 flex items-center">
            <CalendarIcon className="h-4 w-4 mr-1" />
            Rango de fechas
          </h3>
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
          />
        </div>
      </div>
      
      {activeTab === "overview" && (
        <div className="space-y-4">
          <OverviewReport 
            transactions={transactions} 
            categories={categories}
            isLoading={isLoading}
          />
        </div>
      )}
      
      {activeTab === "by-category" && (
        <div className="space-y-4">
          <ExpenseByCategoryReport 
            transactions={transactions} 
            categories={categories}
            isLoading={isLoading}
          />
        </div>
      )}
      
      {activeTab === "monthly-trends" && (
        <div className="space-y-4">
          <MonthlyTrendsReport 
            transactions={transactions}
            isLoading={isLoading}
          />
        </div>
      )}
      
      {activeTab === "budget-comparison" && (
        <div className="space-y-4">
          <BudgetComparisonReport 
            budgets={budgets}
            transactions={transactions}
            categories={categories}
            isLoading={isLoading}
          />
        </div>
      )}
      
      {activeTab === "savings-goals" && (
        <div className="space-y-4">
          <SavingsGoalReport 
            savingsGoals={savingsGoals}
            isLoading={isLoading}
          />
        </div>
      )}
    </Shell>
  );
}
