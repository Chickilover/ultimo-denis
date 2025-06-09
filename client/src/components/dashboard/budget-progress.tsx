import { useMemo } from "react";
import { useQuery, type QueryKey } from "@tanstack/react-query"; // Import QueryKey
import { getQueryFn } from "@/lib/queryClient";
import { useCurrency } from "@/hooks/use-currency";
import { CategoryIcon } from "@/components/ui/category-icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { calculateProgress } from "@/lib/utils";
import type { Budget, Category, Transaction } from "@shared/schema"; // Import types
import { Loader2, AlertTriangle } from "lucide-react"; // For loading/error states

// Define the structure for processed budget items
interface ProcessedBudgetItem extends Budget { // Extends Budget to include all its properties
  categoryName?: string;
  categoryIcon?: string | null;
  categoryColor?: string; // Renamed from 'color' to avoid conflict if Budget has 'color'
  spent: number;
  progress: number;
  status: "good" | "warning" | "danger";
}

export function BudgetProgress() {
  const { formatCurrency, convertCurrency } = useCurrency(); // Added convertCurrency
  
  const { data: budgetsData = [], isLoading: budgetsLoading, isError: budgetsError, error: budgetsErrorObj } = useQuery<Budget[], Error, Budget[], QueryKey>({
    queryKey: ["/api/budgets"],
    queryFn: getQueryFn({ on401: "throw" }),
    initialData: []
  });
  
  const { data: transactionsData = [], isLoading: transactionsLoading, isError: transactionsErrorFetch, error: transactionsErrorObjFetch } = useQuery<Transaction[], Error, Transaction[], QueryKey>({
    queryKey: ["/api/transactions"], // This will fetch ALL transactions. Consider filtering by date range if performance is an issue.
    queryFn: getQueryFn({ on401: "throw" }),
    initialData: []
  });
  
  const { data: categoriesData = [], isLoading: categoriesLoading, isError: categoriesErrorFetch, error: categoriesErrorObjFetch } = useQuery<Category[], Error, Category[], QueryKey>({
    queryKey: ["/api/categories"],
    queryFn: getQueryFn({ on401: "throw" }),
    initialData: []
  });
  
  const budgetsWithProgress = useMemo((): ProcessedBudgetItem[] => {
    if (!budgetsData.length || !categoriesData.length) return []; // Wait for categories as well
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    return budgetsData
      .filter(budget => !budget.endDate || new Date(budget.endDate) >= now) // Filter for active budgets
      .map((budget: Budget): ProcessedBudgetItem => {
        const category = categoriesData.find((cat: Category) => cat.id === budget.categoryId);

        let budgetStartDate: Date, budgetEndDate: Date;

        // Use budget's own start and end dates if defined and period is not overriding (e.g. 'custom' period)
        // For specific periods like 'monthly', 'yearly', calculate relative to current date.
        if (budget.period === "monthly") {
          budgetStartDate = new Date(currentYear, currentMonth, 1);
          budgetEndDate = new Date(currentYear, currentMonth + 1, 0);
        } else if (budget.period === "yearly") {
          budgetStartDate = new Date(currentYear, 0, 1);
          budgetEndDate = new Date(currentYear, 11, 31);
        } else { // weekly, biweekly, or if budget.startDate/endDate are the source of truth
          budgetStartDate = new Date(budget.startDate);
          budgetEndDate = budget.endDate ? new Date(budget.endDate) : new Date(currentYear, currentMonth + 1, 0); // Default end for open-ended budgets
        }

        const relevantTransactions = transactionsData.filter((tx: Transaction) => {
          const txDate = new Date(tx.date);
          return tx.categoryId === budget.categoryId &&
                 tx.transactionTypeId === 2 && // Expense
                 txDate >= budgetStartDate &&
                 txDate <= budgetEndDate;
        });

        const spent = relevantTransactions.reduce((sum: number, tx: Transaction) => {
          let txAmount = parseFloat(tx.amount);
          if (tx.currency !== budget.currency) {
            // Basic conversion, assuming useCurrency hook provides a more robust one if needed
            txAmount = convertCurrency(txAmount, tx.currency, budget.currency);
          }
          return sum + txAmount;
        }, 0);

        const budgetAmount = parseFloat(budget.amount);
        const progress = calculateProgress(spent, budgetAmount);
        const status = progress >= 100 ? "danger" : progress >= 75 ? "warning" : "good";

        return {
          ...budget,
          categoryName: category?.name || "Sin categoría",
          categoryIcon: category?.icon,
          categoryColor: category?.color,
          spent,
          progress,
          status,
        };
      })
      .sort((a, b) => b.progress - a.progress); // Show higher progress first
  }, [budgetsData, transactionsData, categoriesData, convertCurrency]);

  const isLoading = budgetsLoading || transactionsLoading || categoriesLoading;
  const isError = budgetsError || transactionsErrorFetch || categoriesErrorFetch;
  const error = budgetsErrorObj || transactionsErrorObjFetch || categoriesErrorObjFetch;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-md font-medium">Estado de Proyectos</CardTitle>
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardHeader>
        <CardContent className="h-[200px] flex items-center justify-center">
          <p className="text-muted-foreground">Cargando proyectos...</p>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-md font-medium">Estado de Proyectos</CardTitle></CardHeader>
        <CardContent className="h-[200px] flex flex-col items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-destructive mb-2" />
          <p className="text-red-500">Error al cargar proyectos: {error?.message}</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-md font-medium">Estado de Proyectos</CardTitle>
        <Link href="/budgets">
          <Button variant="link" size="sm" className="text-primary">Ver todos</Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {budgetsWithProgress.length > 0 ? (
            budgetsWithProgress.slice(0, 4).map((budget: ProcessedBudgetItem) => (
              <div key={budget.id} className="space-y-1"> {/* Use budget.id as key */}
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-2">
                    <CategoryIcon 
                      name={budget.categoryName || budget.name} 
                      icon={budget.categoryIcon} 
                      color={budget.categoryColor} // Use categoryColor
                      size="md"
                      showEmoji={true}
                      className="flex-shrink-0"
                    />
                    <span className="text-sm font-medium truncate" title={budget.name}>{budget.name}</span>
                  </div>
                  <span className="text-sm font-mono font-medium whitespace-nowrap">
                    {formatCurrency(budget.spent, budget.currency)} / {formatCurrency(parseFloat(budget.amount), budget.currency)}
                  </span>
                </div>
                <div className="w-full bg-muted dark:bg-gray-700 rounded-full h-2.5"> {/* Slightly taller bar */}
                  <div 
                    className={`h-2.5 rounded-full transition-all duration-500 ease-out ${
                      budget.status === 'danger' 
                        ? 'bg-red-500' 
                        : budget.status === 'warning' 
                          ? 'bg-amber-500' 
                          : 'bg-green-500'
                    }`} 
                    style={{ width: `${Math.min(100, budget.progress)}%` }}
                  ></div>
                </div>
                <p className={`text-xs text-right mt-1 ${
                  budget.status === 'danger' 
                    ? 'text-red-600 dark:text-red-400' 
                    : budget.status === 'warning' 
                      ? 'text-amber-600 dark:text-amber-400' 
                      : 'text-green-600 dark:text-green-400' // Default to green if not danger/warning
                }`}>
                  {budget.progress >= 100 && budget.spent > parseFloat(budget.amount)
                    ? `Excedido por ${formatCurrency(budget.spent - parseFloat(budget.amount), budget.currency)}`
                    : budget.progress >= 100
                      ? 'Completado!'
                      : `${budget.progress.toFixed(0)}% utilizado`}
                </p>
              </div>
            ))
          ) : (
            <div className="py-6 text-center text-muted-foreground">
              <CategoryIcon name="Presupuestos" icon={null} color="#cccccc" size="lg" className="mx-auto mb-2" />
              <p>No hay proyectos activos.</p>
              <Link href="/budgets">
                <Button variant="outline" size="sm" className="mt-2">
                  Crear proyecto
                </Button>
              </Link>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
