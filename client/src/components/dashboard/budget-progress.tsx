import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useCurrency } from "@/hooks/use-currency";
import { CategoryIcon } from "@/components/ui/category-icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { calculateProgress } from "@/lib/utils";

export function BudgetProgress() {  // kept same function name to avoid breaking imports
  const { formatCurrency } = useCurrency();
  
  // Fetch budgets
  const { data: budgets = [] } = useQuery({
    queryKey: ["/api/budgets"],
    queryFn: getQueryFn({ on401: "throw" })
  });
  
  // Fetch transactions to calculate actual spending
  const { data: transactions = [] } = useQuery({
    queryKey: ["/api/transactions"],
    queryFn: getQueryFn({ on401: "throw" })
  });
  
  // Fetch categories to get icons and colors
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: getQueryFn({ on401: "throw" })
  });
  
  // Calculate budget progress with category details
  const budgetsWithProgress = useMemo(() => {
    if (!budgets.length) return [];
    
    // Get current date info for period calculations
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    return budgets.map((budget: any) => {
      // Find associated category
      const category = categories.find((cat: any) => cat.id === budget.categoryId) || {};
      
      // Determine date range for this budget based on period
      let startDate, endDate;
      
      if (budget.period === "monthly") {
        startDate = new Date(currentYear, currentMonth, 1);
        endDate = new Date(currentYear, currentMonth + 1, 0);
      } else if (budget.period === "yearly") {
        startDate = new Date(currentYear, 0, 1);
        endDate = new Date(currentYear, 11, 31);
      } else {
        // Default to monthly
        startDate = new Date(currentYear, currentMonth, 1);
        endDate = new Date(currentYear, currentMonth + 1, 0);
      }
      
      // Filter transactions for this budget's category and date range
      const relevantTransactions = transactions.filter((tx: any) => {
        const txDate = new Date(tx.date);
        return tx.categoryId === budget.categoryId &&
               tx.transactionTypeId === 2 && // Expense
               txDate >= startDate &&
               txDate <= endDate;
      });
      
      // Sum up the actual expenses
      const spent = relevantTransactions.reduce((sum: number, tx: any) => {
        return sum + parseFloat(tx.amount);
      }, 0);
      
      // Calculate progress percentage
      const budgetAmount = parseFloat(budget.amount);
      const progress = calculateProgress(spent, budgetAmount);
      const status = progress < 75 ? "good" : progress < 100 ? "warning" : "danger";
      
      return {
        ...budget,
        categoryName: category.name,
        categoryIcon: category.icon,
        color: category.color,
        spent,
        progress,
        status,
      };
    });
  }, [budgets, transactions, categories]);
  
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
            budgetsWithProgress.slice(0, 4).map((budget: any, index: number) => (
              <div key={index} className="space-y-1">
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-2">
                    <CategoryIcon 
                      name={budget.categoryName || budget.name} 
                      icon={budget.categoryIcon} 
                      color={budget.color}
                      size="md"
                      showEmoji={true}
                    />
                    <span className="text-sm font-medium">{budget.name}</span>
                  </div>
                  <span className="text-sm font-mono font-medium">
                    {formatCurrency(budget.spent)} / {formatCurrency(budget.amount)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
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
                      : 'text-green-600 dark:text-green-400'
                }`}>
                  {budget.progress >= 100 
                    ? `Excedido en ${(budget.progress - 100).toFixed(0)}%` 
                    : `${budget.progress.toFixed(0)}% utilizado`}
                </p>
              </div>
            ))
          ) : (
            <div className="py-6 text-center text-muted-foreground">
              <p>No hay proyectos activos</p>
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
