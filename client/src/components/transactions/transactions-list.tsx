import { useState } from "react";
import { useQuery, type QueryKey } from "@tanstack/react-query"; // Import QueryKey
import { getQueryFn } from "@/lib/queryClient";
import { formatUYU, formatUSD } from "@/lib/format";
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, Calendar, Edit, MoreHorizontal, Tag, Info } from "lucide-react"; // Added Info for empty state
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { TransactionForm } from "./transaction-form";
import { Dialog, DialogContent, DialogDescription } from "@/components/ui/dialog";
import type { Transaction, Category } from "@shared/schema"; // Import types

type TransactionFilterType = "all" | "income" | "expense" | "transfer";

interface TransactionsListProps {
  transactionType?: TransactionFilterType; // Renamed to avoid conflict with Transaction type
  // If transactions/categories were passed as props, they would be here:
  // transactions?: Transaction[];
  // categories?: Category[];
}

export function TransactionsList({ transactionType = "all" }: TransactionsListProps) {
  const [activeTab, setActiveTab] = useState<TransactionFilterType>(transactionType);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  // editingTransactionId is already number | null, which is fine.
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const { data: transactionsData = [], isLoading: transactionsIsLoading, error: transactionsError } = useQuery<Transaction[], Error, Transaction[], QueryKey>({
    queryKey: ["/api/transactions"], // QueryKey type will be inferred
    queryFn: getQueryFn({ on401: "throw" }),
    initialData: [], // Ensures transactionsData is always Transaction[]
  });

  const { data: categoriesData = [], isLoading: categoriesIsLoading, error: categoriesError } = useQuery<Category[], Error, Category[], QueryKey>({
    queryKey: ["/api/categories"],
    queryFn: getQueryFn({ on401: "throw" }),
    initialData: [], // Ensures categoriesData is always Category[]
  });

  const filteredTransactions = transactionsData.filter((transaction: Transaction) => {
    if (activeTab === "all") return true;
    if (activeTab === "income") return transaction.transactionTypeId === 1; // Assuming 1 is income
    if (activeTab === "expense") return transaction.transactionTypeId === 2; // Assuming 2 is expense
    if (activeTab === "transfer") return transaction.transactionTypeId === 3; // Assuming 3 is transfer
    return true;
  });

  const handleEdit = (transaction: Transaction) => {
    // setEditingTransactionId(transaction.id); // Not needed if passing whole transaction object to form
    setEditingTransaction(transaction);
    setIsEditDialogOpen(true);
  };

  const getCategoryName = (categoryId: number): string => {
    const category = categoriesData.find((cat: Category) => cat.id === categoryId);
    return category ? category.name : "Sin categoría";
  };

  const getTransactionIcon = (typeId: number | null) => { // Allow null for typeId
    if (typeId === 1) return <ArrowUpCircle className="h-5 w-5 text-green-500" />;
    if (typeId === 2) return <ArrowDownCircle className="h-5 w-5 text-red-500" />;
    // Assuming typeId 3 for transfer or default
    return <ArrowUpCircle className="h-5 w-5 text-blue-500" />; // Default or transfer icon
  };

  const isLoading = transactionsIsLoading || categoriesIsLoading;

  if (!isLoading && filteredTransactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-4 border rounded-lg shadow-sm bg-card">
        <Info className="h-12 w-12 text-muted-foreground mb-3" />
        <h3 className="text-xl font-semibold">No hay transacciones</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {activeTab === "all"
            ? "No se han registrado transacciones todavía."
            : `No se encontraron transacciones de tipo "${activeTab}".`}
        </p>
      </div>
    );
  }

  if (transactionsError || categoriesError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-4 border border-destructive/50 rounded-lg shadow-sm bg-destructive/10 text-destructive">
        <AlertTriangle className="h-12 w-12 mb-3" />
        <h3 className="text-xl font-semibold">Error al cargar datos</h3>
        <p className="text-sm mt-1">
          {transactionsError?.message || categoriesError?.message || "No se pudieron cargar los datos necesarios."}
        </p>
      </div>
    );
  }


  return (
    <div>
      {transactionType === "all" && (
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TransactionFilterType)} className="w-full mb-6">
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
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="h-5 w-2/3 bg-muted rounded"></div>
              </CardHeader>
              <CardContent className="pb-4 pt-0 px-4">
                <div className="h-4 w-1/2 bg-muted rounded mb-2"></div>
                <div className="h-4 w-1/3 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))
        ) : (
          filteredTransactions.map((transaction: Transaction) => (
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
                    className={transaction.isShared ? "bg-purple-100 hover:bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-800/30 dark:text-purple-300 dark:border-purple-700" : ""}
                  >
                    {transaction.isShared ? "Compartido" : "Personal"}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8"> {/* Adjusted size */}
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
                      {/* Ensure transaction.date is a Date object or valid date string */}
                      {format(new Date(transaction.date), "PPP", { locale: es })}
                    </div>
                  </div>
                  <div className={`text-lg font-medium ${
                    transaction.transactionTypeId === 1 
                      ? "text-green-600 dark:text-green-400"
                      : transaction.transactionTypeId === 2 
                        ? "text-red-600 dark:text-red-400"
                        : "text-blue-600 dark:text-blue-400" // Color for transfers or others
                  }`}>
                    {transaction.transactionTypeId === 1 ? "+" : transaction.transactionTypeId === 2 ? "-" : ""}
                    {transaction.currency === "USD" 
                      ? formatUSD(parseFloat(transaction.amount))
                      : formatUYU(parseFloat(transaction.amount))
                    }
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

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
                defaultValues={editingTransaction} // Pass the full Transaction object
                editMode={true}
                transactionId={editingTransaction.id} // Pass id directly
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}