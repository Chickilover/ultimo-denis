import { useQuery, type QueryKey } from "@tanstack/react-query"; // Import QueryKey
import { getQueryFn } from "@/lib/queryClient";
import { useCurrency } from "@/hooks/use-currency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { getRelativeTimeString } from "@/lib/utils"; // formatDate not used directly
import {
  ShoppingCart,
  ArrowUpRight,
  Receipt,
  Briefcase, // Using Briefcase for "Servicios" as Computer might be less fitting
  Film,      // Using Film for "Entretenimiento"
  PiggyBank, // Default icon
  AlertTriangle // For empty/error states
} from "lucide-react";
import type { Transaction, Category } from "@shared/schema"; // Import types

// Map category IDs to icons - this is brittle if IDs change. A better way is to use category.icon field.
// For now, sticking to the existing logic but with typed icons.
const categoryIcons: Record<number, JSX.Element> = {
  5: <ShoppingCart className="h-5 w-5" />,    // Assuming ID 5 is Alimentación
  6: <Briefcase className="h-5 w-5" />,      // Assuming ID 6 is Vivienda (using Briefcase as placeholder)
  8: <Receipt className="h-5 w-5" />,        // Assuming ID 8 is Servicios
  9: <Film className="h-5 w-5" />,           // Assuming ID 9 is Entretenimiento
  // Add more mappings as needed or use a default
};

const defaultCategoryIcon = <PiggyBank className="h-5 w-5" />; // Default icon

interface RecentTransactionsProps {
  limit?: number;
}

export function RecentTransactions({ limit = 5 }: RecentTransactionsProps) {
  const { formatCurrency } = useCurrency();
  
  const { data: transactionsData = [], isLoading: transactionsLoading, isError: transactionsError, error: transactionsErrorObj } = useQuery<Transaction[], Error, Transaction[], QueryKey>({
    queryKey: ["/api/transactions"], // Potentially add filters if this list should be specific
    queryFn: getQueryFn({ on401: "throw" }),
    initialData: []
  });
  
  const { data: categoriesData = [], isLoading: categoriesLoading, isError: categoriesError, error: categoriesErrorObj } = useQuery<Category[], Error, Category[], QueryKey>({
    queryKey: ["/api/categories"],
    queryFn: getQueryFn({ on401: "throw" }),
    initialData: []
  });
  
  const getCategoryInfo = (categoryId: number): { name: string; icon: JSX.Element } => {
    const category = categoriesData.find((c: Category) => c.id === categoryId);
    const name = category ? category.name : "Sin categoría";
    // Attempt to use category.icon string from data first, then fallback to mapped or default icon
    let iconElement = defaultCategoryIcon;
    if (category && category.icon) {
        // This part would require a mapping from string icon names (like 'ShoppingCart') to actual Lucide components
        // For simplicity, if category.icon is a key in categoryIcons, use it. Otherwise, default.
        // A more robust solution involves a component that renders icons based on string names.
        iconElement = categoryIcons[category.id] || defaultCategoryIcon; // Example: still using ID based map
                                                                      // In a real app: resolveIconComponent(category.icon) || defaultCategoryIcon;
    } else if (category) {
        iconElement = categoryIcons[category.id] || defaultCategoryIcon; // Fallback to ID based map if category.icon is not useful
    }
    return { name, icon: iconElement };
  };
  
  const sortedTransactions = [...transactionsData].sort((a: Transaction, b: Transaction) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
  
  const recentTransactions = sortedTransactions.slice(0, limit);

  const isLoading = transactionsLoading || categoriesLoading;
  const isError = transactionsError || categoriesError;
  const error = transactionsErrorObj || categoriesErrorObj;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-md font-medium">Transacciones Recientes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {[...Array(limit)].map((_, i) => (
            <div key={i} className="flex justify-between items-center p-2 animate-pulse">
              <div className="flex items-center">
                <div className="rounded-full bg-muted h-10 w-10 mr-3"></div>
                <div>
                  <div className="h-4 w-32 bg-muted rounded mb-1"></div>
                  <div className="h-3 w-24 bg-muted rounded"></div>
                </div>
              </div>
              <div className="text-right">
                <div className="h-4 w-20 bg-muted rounded mb-1"></div>
                <div className="h-3 w-16 bg-muted rounded"></div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-md font-medium">Transacciones Recientes</CardTitle></CardHeader>
        <CardContent><p className="text-red-500">Error al cargar datos: {error?.message}</p></CardContent>
      </Card>
    );
  }
  
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
            recentTransactions.map((transaction: Transaction) => {
              const categoryInfo = getCategoryInfo(transaction.categoryId);
              const amount = parseFloat(transaction.amount); // amount is string

              return (
                <div
                  key={transaction.id} // Use transaction.id for key
                  className="flex justify-between items-center p-2 hover:bg-muted/50 rounded-lg transition-colors"
                >
                  <div className="flex items-center">
                    <div className={`rounded-full p-2 mr-3 ${
                      transaction.transactionTypeId === 1
                        ? "bg-green-100 dark:bg-green-900/50"
                        : "bg-primary-100 dark:bg-primary-900/50" // Default for expenses/transfers
                    }`}>
                      {transaction.transactionTypeId === 1
                        ? <ArrowUpRight className="h-5 w-5 text-green-600 dark:text-green-400" />
                        : categoryInfo.icon}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{transaction.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {getRelativeTimeString(new Date(transaction.date))} · {/* Ensure date is Date object */}
                        {transaction.isShared ? " Compartido" : " Personal"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium font-mono ${
                      transaction.transactionTypeId === 1
                        ? "text-green-600 dark:text-green-400"
                        : transaction.transactionTypeId === 2
                          ? "text-red-600 dark:text-red-400"
                          : "text-blue-600 dark:text-blue-400" // Color for transfers or other types
                    }`}>
                      {transaction.transactionTypeId === 1 ? "+" : transaction.transactionTypeId === 2 ? "-" : ""}
                      {formatCurrency(amount, transaction.currency)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {categoryInfo.name}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-6 text-center text-muted-foreground">
              <AlertTriangle className="h-10 w-10 mx-auto text-gray-400 mb-2" />
              <p>No hay transacciones recientes.</p>
              <Link href="/transactions/new">
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
