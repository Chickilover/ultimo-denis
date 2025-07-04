import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { useCurrency } from "@/hooks/use-currency";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
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
  Filter,
  ArrowUpDown,
  CalendarIcon
} from "lucide-react";

import { TransactionForm } from "./transaction-form";

interface TransactionListProps {
  transactionType?: string;
}

export function TransactionList({ transactionType = "all" }: TransactionListProps) {
  const { formatCurrency } = useCurrency();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Estado para filtros y ordenamiento
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState("newest");
  
  // Estado para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  
  // State for transaction editing/deleting
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  
  // Estado para el filtro móvil
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
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
    
    if (categoryFilter && categoryFilter !== 'all') {
      params.categoryId = categoryFilter;
    }
    
    if (userFilter && userFilter !== 'all') {
      params.userId = userFilter;
    }
    
    // Add transaction type filter based on the tab
    if (transactionType === 'income') {
      params.transactionTypeId = '1';
    } else if (transactionType === 'expense') {
      params.transactionTypeId = '2';
    } else if (transactionType === 'transfer') {
      params.transactionTypeId = '3';
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
  
  // Fetch family members to display who created each transaction
  const { data: familyMembers = [] } = useQuery({
    queryKey: ["/api/family-members"],
    queryFn: getQueryFn({ on401: "throw" }),
  });
  
  // Helper function to get category name by ID
  const getCategoryName = (categoryId: number) => {
    const category = categories.find((c: any) => c.id === categoryId);
    return category ? category.name : "Sin categoría";
  };
  
  // Helper function to get account name by ID
  const getAccountName = (accountId: number) => {
    const account = accounts.find((a: any) => a.id === accountId);
    return account ? account.name : "Cuenta";
  };
  
  // Helper function to get user info (name and initials)
  const getUserInfo = (userId: number) => {
    // Current user
    if (user && user.id === userId) {
      const name = user.username;
      const initials = name.substring(0, 2).toUpperCase();
      
      return {
        name,
        initials,
      };
    }
    
    // Family member
    const member = familyMembers.find((m: any) => m.userId === userId);
    if (member) {
      const name = member.name;
      const initials = name.substring(0, 2).toUpperCase();
      
      return {
        name,
        initials,
      };
    };
    
    return {
      name: "Usuario",
      initials: "US",
    };
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
  
  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        {/* Barra superior con búsqueda */}
        <div className="p-3 border-b">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar transacciones..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="whitespace-nowrap"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </Button>
          </div>
        </div>
        
        {/* Filtros expandibles */}
        {isFilterOpen && (
          <div className="p-3 border-b bg-muted/20">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Categoría</label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las categorías" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    {categories.map((category: any) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1.5 block">Miembro</label>
                <Select value={userFilter} onValueChange={setUserFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los miembros" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los miembros</SelectItem>
                    {familyMembers.map((member: any) => (
                      <SelectItem key={member.id} value={member.userId.toString()}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1.5 block">Ordenar por</label>
                <Select value={sortOrder} onValueChange={setSortOrder}>
                  <SelectTrigger>
                    <SelectValue placeholder="Ordenar por" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Más recientes</SelectItem>
                    <SelectItem value="oldest">Más antiguas</SelectItem>
                    <SelectItem value="highest">Mayor importe</SelectItem>
                    <SelectItem value="lowest">Menor importe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="col-span-1 sm:col-span-3">
                <label className="text-sm font-medium mb-1.5 block">Rango de fechas</label>
                <DateRangePicker
                  dateRange={dateRange}
                  onDateRangeChange={setDateRange}
                  className="w-full"
                />
              </div>
            </div>

            {/* Filtros activos */}
            {(categoryFilter !== 'all' || userFilter !== 'all' || dateRange?.from) && (
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
                {categoryFilter !== 'all' && (
                  <Badge 
                    variant="outline" 
                    className="bg-primary/10 text-primary rounded-full flex items-center gap-1"
                  >
                    Categoría: {getCategoryName(parseInt(categoryFilter))}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-4 w-4 p-0 rounded-full" 
                      onClick={() => setCategoryFilter("all")}
                    >
                      ×
                    </Button>
                  </Badge>
                )}
                
                {userFilter !== 'all' && (
                  <Badge 
                    variant="outline" 
                    className="bg-primary/10 text-primary rounded-full flex items-center gap-1"
                  >
                    Miembro: {familyMembers.find((m: any) => m.userId.toString() === userFilter)?.name || 'Usuario'}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-4 w-4 p-0 rounded-full" 
                      onClick={() => setUserFilter("all")}
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
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-muted-foreground text-xs h-7" 
                  onClick={() => {
                    setCategoryFilter("all");
                    setUserFilter("all");
                    setDateRange(undefined);
                  }}
                >
                  Limpiar filtros
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Lista de transacciones */}
        <div className="overflow-x-auto">
          {/* Información de resultados */}
          <div className="bg-muted/30 py-2 px-4 text-sm text-muted-foreground border-b">
            {sortedTransactions.length === 0 ? "No hay transacciones" : 
             sortedTransactions.length === 1 ? "1 transacción" :
             `${sortedTransactions.length} transacciones`}
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="flex flex-col items-center gap-2">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                <p className="text-sm text-muted-foreground">Cargando transacciones...</p>
              </div>
            </div>
          ) : paginatedTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <p className="text-muted-foreground mb-2">No se encontraron transacciones</p>
              <p className="text-sm text-muted-foreground max-w-md">
                Intenta cambiar los filtros o agrega una nueva transacción para comenzar.
              </p>
            </div>
          ) : (
            <div>
              {/* Vista móvil */}
              <div className="sm:hidden divide-y">
                {paginatedTransactions.map((transaction: any) => (
                  <div key={transaction.id} className="p-4">
                    <div className="flex justify-between mb-2">
                      <div>
                        <h3 className="font-medium">{transaction.description}</h3>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(transaction.date)} • {getCategoryName(transaction.categoryId)}
                        </p>
                      </div>
                      <div>
                        <span className={`font-semibold ${
                          transaction.transactionTypeId === 1 ? "text-green-600" : 
                          transaction.transactionTypeId === 2 ? "text-red-600" : ""
                        }`}>
                          {formatCurrency(transaction.amount, transaction.currency)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center mt-2">
                      {transaction.userId && (
                        <div className="flex items-center text-xs text-muted-foreground">
                          <div className="h-5 w-5 rounded-full bg-accent flex items-center justify-center text-[10px] font-medium mr-1">
                            {getUserInfo(transaction.userId).initials}
                          </div>
                          <span>{getUserInfo(transaction.userId).name}</span>
                        </div>
                      )}
                      
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleEditTransaction(transaction)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                          <span className="sr-only">Editar</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive"
                          onClick={() => handleDeleteTransaction(transaction)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="sr-only">Eliminar</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Vista desktop */}
              <table className="w-full hidden sm:table">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Fecha</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Descripción</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Categoría</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Realizada por</th>
                    <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">Importe</th>
                    <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground"></th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTransactions.map((transaction: any) => (
                    <tr key={transaction.id} className="hover:bg-muted/50 border-b">
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
                      <td className="py-3 px-4">
                        {transaction.userId && (
                          <div className="flex items-center">
                            <div className="h-7 w-7 rounded-full bg-accent flex items-center justify-center text-xs font-medium mr-2">
                              {getUserInfo(transaction.userId).initials}
                            </div>
                            <span className="text-sm">{getUserInfo(transaction.userId).name}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`text-sm font-semibold ${
                          transaction.transactionTypeId === 1 ? "text-green-600" : 
                          transaction.transactionTypeId === 2 ? "text-red-600" : ""
                        }`}>
                          {formatCurrency(transaction.amount, transaction.currency)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">Acciones</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleEditTransaction(transaction)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteTransaction(transaction)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Siguiente
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* Modal de edición de transacción */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="md:max-w-2xl max-h-screen overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar transacción</DialogTitle>
            <DialogDescription>
              Modifica los detalles de la transacción
            </DialogDescription>
          </DialogHeader>
          
          {selectedTransaction && (
            <TransactionForm 
              onSuccess={() => setIsEditModalOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
      
      {/* Modal de confirmación de eliminación */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar transacción</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar esta transacción? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={deleteTransaction}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}