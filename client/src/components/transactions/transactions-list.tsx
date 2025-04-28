import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { formatUYU, formatUSD } from "@/lib/format";
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, Calendar, Edit, MoreHorizontal, Tag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { TransactionForm } from "./transaction-form";
import { Dialog, DialogContent, DialogDescription } from "@/components/ui/dialog";

type TransactionType = "all" | "income" | "expense" | "transfer";

interface TransactionsListProps {
  transactionType?: TransactionType;
}

export function TransactionsList({ transactionType = "all" }: TransactionsListProps) {
  const [activeTab, setActiveTab] = useState<string>(transactionType);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState<number | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<any | null>(null);

  // Get transactions
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["/api/transactions"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Get categories
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Filter transactions based on activeTab
  const filteredTransactions = transactions.filter((transaction: any) => {
    if (activeTab === "all") return true;
    if (activeTab === "income") return transaction.transactionTypeId === 1;
    if (activeTab === "expense") return transaction.transactionTypeId === 2;
    if (activeTab === "transfer") return transaction.transactionTypeId === 3;
    return true;
  });

  const handleEdit = (transaction: any) => {
    setEditingTransactionId(transaction.id);
    setEditingTransaction(transaction);
    setIsEditDialogOpen(true);
  };

  const getCategoryName = (categoryId: number) => {
    const category = categories.find((cat: any) => cat.id === categoryId);
    return category ? category.name : "Sin categoría";
  };

  // Transaction icon based on type
  const getTransactionIcon = (typeId: number) => {
    if (typeId === 1) return <ArrowUpCircle className="h-5 w-5 text-green-500" />;
    if (typeId === 2) return <ArrowDownCircle className="h-5 w-5 text-red-500" />;
    return <ArrowUpCircle className="h-5 w-5 text-blue-500" />;
  };

  // Show empty state if no transactions
  if (!isLoading && filteredTransactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-4">
        <AlertTriangle className="h-10 w-10 text-muted-foreground mb-2" />
        <h3 className="text-lg font-medium">No hay transacciones</h3>
        <p className="text-sm text-muted-foreground mt-1">
          No se encontraron transacciones que coincidan con los filtros seleccionados.
        </p>
      </div>
    );
  }

  return (
    <div>
      {transactionType === "all" && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mb-6">
          <TabsList className="grid grid-cols-4">
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="income">Ingresos</TabsTrigger>
            <TabsTrigger value="expense">Gastos</TabsTrigger>
            <TabsTrigger value="transfer">Transferencias</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      <div className="grid gap-4">
        {isLoading ? (
          // Loading skeleton
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-5 w-1/3 bg-muted rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-4 w-1/2 bg-muted rounded mb-2"></div>
                <div className="h-4 w-1/4 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))
        ) : (
          // Transactions list
          filteredTransactions.map((transaction: any) => (
            <Card key={transaction.id}>
              <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  {getTransactionIcon(transaction.transactionTypeId)}
                  <CardTitle className="text-base font-medium">
                    {transaction.description}
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={transaction.isShared ? "default" : "outline"}
                    className={transaction.isShared ? "bg-purple-100 hover:bg-purple-100 text-purple-800 border-purple-200" : ""}
                  >
                    {transaction.isShared ? "Compartido" : "Personal"}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(transaction)}>
                        <Edit className="mr-2 h-4 w-4" /> Editar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="pb-4 pt-0 px-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground flex items-center">
                      <Tag className="mr-1 h-3.5 w-3.5" />
                      {getCategoryName(transaction.categoryId)}
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center">
                      <Calendar className="mr-1 h-3.5 w-3.5" />
                      {format(new Date(transaction.date), "PPP", { locale: es })}
                    </div>
                  </div>
                  <div className={`text-lg font-medium ${
                    transaction.transactionTypeId === 1 
                      ? "text-green-600" 
                      : transaction.transactionTypeId === 2 
                        ? "text-red-600" 
                        : ""
                  }`}>
                    {transaction.transactionTypeId === 1 ? "+" : transaction.transactionTypeId === 2 ? "-" : ""}
                    {transaction.currency === "USD" 
                      ? formatUSD(transaction.amount) 
                      : formatUYU(transaction.amount)
                    }
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Transaction Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" aria-describedby="edit-dialog-description">
          <div className="space-y-4 py-2 pb-4">
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-center">Editar Transacción</h2>
              <DialogDescription id="edit-dialog-description" className="text-center">
                Modifica los detalles de esta transacción
              </DialogDescription>
            </div>
            {editingTransaction && (
              <TransactionForm 
                onComplete={() => setIsEditDialogOpen(false)}
                defaultValues={editingTransaction}
                editMode={true}
                transactionId={editingTransactionId || undefined}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}