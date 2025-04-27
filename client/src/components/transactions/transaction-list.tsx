import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { useCurrency } from "@/hooks/use-currency";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import {
  Search,
  ShoppingBag,
  MoreVertical,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { TransactionForm } from "./transaction-form";

export function TransactionList() {
  const { formatCurrency } = useCurrency();
  const { toast } = useToast();
  
  // State for filters
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [accountFilter, setAccountFilter] = useState<string>("");
  const [sortOrder, setSortOrder] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  
  // State for transaction editing/deleting
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  
  // Format filter params for API request
  const getFilterParams = () => {
    const params: Record<string, string> = {};
    
    if (searchQuery) {
      params.search = searchQuery;
    }
    
    if (dateRange?.from) {
      params.startDate = dateRange.from.toISOString().split('T')[0];
    }
    
    if (dateRange?.to) {
      params.endDate = dateRange.to.toISOString().split('T')[0];
    }
    
    if (categoryFilter) {
      params.categoryId = categoryFilter;
    }
    
    if (accountFilter) {
      params.accountId = accountFilter;
    }
    
    return params;
  };
  
  // Fetch transactions
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["/api/transactions", getFilterParams()],
    queryFn: getQueryFn({ on401: "throw" }),
  });
  
  // Fetch categories for filter
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: getQueryFn({ on401: "throw" }),
  });
  
  // Fetch accounts for filter
  const { data: accounts = [] } = useQuery({
    queryKey: ["/api/accounts"],
    queryFn: getQueryFn({ on401: "throw" }),
  });
  
  // Helper function to get category name
  const getCategoryName = (categoryId: number) => {
    const category = categories.find((c: any) => c.id === categoryId);
    return category ? category.name : "Sin categoría";
  };
  
  // Helper function to get account name
  const getAccountName = (accountId: number) => {
    const account = accounts.find((a: any) => a.id === accountId);
    return account ? account.name : "Sin cuenta";
  };
  
  // Sort transactions
  const sortedTransactions = [...transactions].sort((a: any, b: any) => {
    if (sortOrder === "newest") {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    } else if (sortOrder === "oldest") {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    } else if (sortOrder === "highest") {
      return parseFloat(b.amount) - parseFloat(a.amount);
    } else if (sortOrder === "lowest") {
      return parseFloat(a.amount) - parseFloat(b.amount);
    }
    return 0;
  });
  
  // Pagination
  const totalPages = Math.ceil(sortedTransactions.length / pageSize);
  const paginatedTransactions = sortedTransactions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  
  // Handle edit transaction
  const handleEditTransaction = (transaction: any) => {
    setSelectedTransaction(transaction);
    setIsEditModalOpen(true);
  };
  
  // Handle delete transaction
  const handleDeleteTransaction = (transaction: any) => {
    setSelectedTransaction(transaction);
    setIsDeleteModalOpen(true);
  };
  
  // Delete transaction
  const deleteTransaction = async () => {
    if (!selectedTransaction) return;
    
    try {
      await apiRequest("DELETE", `/api/transactions/${selectedTransaction.id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      toast({
        title: "Transacción eliminada",
        description: "La transacción se ha eliminado correctamente",
      });
      setIsDeleteModalOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la transacción",
        variant: "destructive",
      });
    }
  };
  
  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setDateRange(undefined);
    setCategoryFilter("");
    setAccountFilter("");
    setCurrentPage(1);
  };
  
  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="flex items-center bg-muted rounded-full px-3 py-1">
            <span className="text-sm font-medium mr-2">Filtros:</span>
            {(!searchQuery && !dateRange && !categoryFilter && !accountFilter) ? (
              <Badge variant="outline" className="bg-primary/10 text-primary rounded-full">Todos</Badge>
            ) : (
              <Button variant="ghost" size="sm" className="h-6 px-2 rounded-full" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            )}
          </div>
          
          {categoryFilter && (
            <Badge 
              variant="outline" 
              className="bg-primary/10 text-primary rounded-full flex items-center gap-1"
            >
              Categoría: {getCategoryName(parseInt(categoryFilter))}
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-4 w-4 p-0 rounded-full" 
                onClick={() => setCategoryFilter("")}
              >
                ×
              </Button>
            </Badge>
          )}
          
          {accountFilter && (
            <Badge 
              variant="outline" 
              className="bg-primary/10 text-primary rounded-full flex items-center gap-1"
            >
              Cuenta: {getAccountName(parseInt(accountFilter))}
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-4 w-4 p-0 rounded-full" 
                onClick={() => setAccountFilter("")}
              >
                ×
              </Button>
            </Badge>
          )}
          
          {dateRange?.from && (
            <Badge 
              variant="outline" 
              className="bg-primary/10 text-primary rounded-full flex items-center gap-1"
            >
              Fecha: {formatDate(dateRange.from)} {dateRange.to ? `- ${formatDate(dateRange.to)}` : ""}
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-4 w-4 p-0 rounded-full" 
                onClick={() => setDateRange(undefined)}
              >
                ×
              </Button>
            </Badge>
          )}
          
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-auto text-xs bg-muted border-none rounded-full px-3 py-1 h-7">
              <span className="whitespace-nowrap">+ Categoría</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas las categorías</SelectItem>
              {categories.map((category: any) => (
                <SelectItem key={category.id} value={category.id.toString()}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={accountFilter} onValueChange={setAccountFilter}>
            <SelectTrigger className="w-auto text-xs bg-muted border-none rounded-full px-3 py-1 h-7">
              <span className="whitespace-nowrap">+ Cuenta</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas las cuentas</SelectItem>
              {accounts.map((account: any) => (
                <SelectItem key={account.id} value={account.id.toString()}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <DateRangePicker
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            className="w-auto"
          />
        </div>
        
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar transacciones..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Select value={sortOrder} onValueChange={setSortOrder}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Más recientes</SelectItem>
              <SelectItem value="oldest">Más antiguos</SelectItem>
              <SelectItem value="highest">Mayor importe</SelectItem>
              <SelectItem value="lowest">Menor importe</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Transactions Table */}
      <div className="rounded-md border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Fecha</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Descripción</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Categoría</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Cuenta</th>
                <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">Importe</th>
                <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-muted-foreground">
                    Cargando transacciones...
                  </td>
                </tr>
              ) : paginatedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-muted-foreground">
                    No se encontraron transacciones
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((transaction: any) => (
                  <tr key={transaction.id} className="hover:bg-muted/50">
                    <td className="py-3 px-4 text-sm">{formatDate(transaction.date)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        <div className="bg-primary-100 dark:bg-primary-900/50 rounded-full p-1.5 mr-2">
                          <ShoppingBag className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{transaction.description}</p>
                          <div className="flex space-x-1 mt-0.5">
                            <span className="text-xs px-1.5 py-0.5 bg-muted rounded text-muted-foreground">
                              {transaction.isShared ? "Compartido" : "Personal"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm">{getCategoryName(transaction.categoryId)}</td>
                    <td className="py-3 px-4 text-sm">{getAccountName(transaction.accountId)}</td>
                    <td className="py-3 px-4 text-sm text-right font-medium font-mono">
                      <span className={transaction.transactionTypeId === 1 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                        {transaction.transactionTypeId === 1 ? "+" : "-"}
                        {formatCurrency(transaction.amount, transaction.currency)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleEditTransaction(transaction)}>
                            <Edit className="mr-2 h-4 w-4" />
                            <span>Editar</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteTransaction(transaction)}
                            className="text-red-600 dark:text-red-400"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Eliminar</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <div className="text-sm text-muted-foreground">
              Mostrando {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, sortedTransactions.length)} de {sortedTransactions.length} transacciones
            </div>
            <div className="flex space-x-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
      
      {/* Edit Transaction Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-lg">
          {selectedTransaction && (
            <TransactionForm
              onComplete={() => setIsEditModalOpen(false)}
              defaultValues={selectedTransaction}
              editMode={true}
              transactionId={selectedTransaction.id}
            />
          )}
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar esta transacción? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={deleteTransaction}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
