import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useCurrency } from "@/hooks/use-currency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { formatDate, getRelativeTimeString } from "@/lib/utils";
import {
  ShoppingCart,
  ArrowUpRight,
  Receipt,
  Computer
} from "lucide-react";

// Map category types to icons
const categoryIcons: Record<number, any> = {
  5: <ShoppingCart className="h-5 w-5" />, // Alimentación
  6: <Computer className="h-5 w-5" />, // Vivienda
  8: <Receipt className="h-5 w-5" />, // Servicios
  9: <Computer className="h-5 w-5" />, // Entretenimiento
};

export function RecentTransactions() {
  const { formatCurrency } = useCurrency();
  
  // Fetch transactions
  const { data: transactions = [] } = useQuery({
    queryKey: ["/api/transactions"],
    queryFn: getQueryFn({ on401: "throw" })
  });
  
  // Fetch categories to get names
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: getQueryFn({ on401: "throw" })
  });
  
  // Get category name by ID
  const getCategoryName = (categoryId: number) => {
    const category = categories.find((c: any) => c.id === categoryId);
    return category ? category.name : "Sin categoría";
  };
  
  // Get category icon by ID
  const getCategoryIcon = (categoryId: number) => {
    return categoryIcons[categoryId] || <ArrowUpRight className="h-5 w-5" />;
  };
  
  // Sort transactions by date (latest first)
  const sortedTransactions = [...transactions].sort((a: any, b: any) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
  
  // Take only the 5 most recent transactions
  const recentTransactions = sortedTransactions.slice(0, 5);
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-md font-medium">Transacciones Recientes</CardTitle>
        <Link href="/transactions">
          <Button variant="link" size="sm" className="text-primary">Ver todas</Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {recentTransactions.length > 0 ? (
            recentTransactions.map((transaction: any, index: number) => (
              <div 
                key={index} 
                className="flex justify-between items-center p-2 hover:bg-muted/50 rounded-lg transition-colors"
              >
                <div className="flex items-center">
                  <div className={`rounded-full p-2 mr-3 ${
                    transaction.transactionTypeId === 1 
                      ? "bg-green-100 dark:bg-green-900/50" 
                      : "bg-primary-100 dark:bg-primary-900/50"
                  }`}>
                    {transaction.transactionTypeId === 1 
                      ? <ArrowUpRight className="h-5 w-5 text-green-600 dark:text-green-400" /> 
                      : getCategoryIcon(transaction.categoryId)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{transaction.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {getRelativeTimeString(transaction.date)} · 
                      {transaction.isShared ? " Compartido" : " Personal"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-medium font-mono ${
                    transaction.transactionTypeId === 1 
                      ? "text-green-600 dark:text-green-400" 
                      : "text-red-600 dark:text-red-400"
                  }`}>
                    {transaction.transactionTypeId === 1 ? "+" : "-"}
                    {formatCurrency(transaction.amount)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {getCategoryName(transaction.categoryId)}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="py-6 text-center text-muted-foreground">
              <p>No hay transacciones recientes</p>
              <Link href="/transactions">
                <Button variant="outline" size="sm" className="mt-2">
                  Registrar transacción
                </Button>
              </Link>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
