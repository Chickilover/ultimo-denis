import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useCurrency } from "@/hooks/use-currency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { calculateProgress } from "@/lib/utils";
import { 
  ShoppingCart, 
  Phone, 
  Utensils, 
  Gift 
} from "lucide-react";

// Map category names to icons
const categoryIcons: Record<string, any> = {
  "Supermercado": <ShoppingCart className="h-5 w-5 text-accent-500" />,
  "Teléfono e Internet": <Phone className="h-5 w-5 text-red-500" />,
  "Restaurantes": <Utensils className="h-5 w-5 text-primary-500" />,
  "Regalos": <Gift className="h-5 w-5 text-green-500" />,
};

export function BudgetProgress() {
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
  
  // Calculate budget progress
  const budgetsWithProgress = useMemo(() => {
    if (!budgets.length) return [];
    
    // Get current date info for period calculations
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    return budgets.map((budget: any) => {
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
        spent,
        progress,
        status,
      };
    });
  }, [budgets, transactions]);
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-md font-medium">Estado de Presupuestos</CardTitle>
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
                  <div className="flex items-center">
                    {categoryIcons[budget.name] || 
                     <div className="h-5 w-5 bg-primary/20 rounded-full flex items-center justify-center text-primary">
                       {budget.name.charAt(0)}
                     </div>
                    }
                    <span className="text-sm font-medium ml-2">{budget.name}</span>
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
              <p>No hay presupuestos activos</p>
              <Link href="/budgets">
                <Button variant="outline" size="sm" className="mt-2">
                  Crear presupuesto
                </Button>
              </Link>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
