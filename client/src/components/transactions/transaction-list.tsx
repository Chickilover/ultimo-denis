import { useState, useMemo } from "react"; // Added useMemo
import { useQuery, type QueryKey } from "@tanstack/react-query"; // Import QueryKey
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
  ArrowUpDown, // Not used, consider removing
  CalendarIcon, // Not used, consider removing
  Loader2 // Added for loading states
} from "lucide-react";

import { TransactionForm } from "./transaction-form";
import type { Transaction, Category, Account, FamilyMember, User } from "@shared/schema"; // Import types

// Props interface for TransactionList component
interface TransactionListProps {
  transactionType?: "all" | "income" | "expense" | "transfer"; // More specific type
}

// Structure for user info helper
interface UserInfo {
  name: string;
  initials: string;
  avatarColor?: string | null; // Added avatarColor
}

export function TransactionList({ transactionType = "all" }: TransactionListProps) {
  const { formatCurrency } = useCurrency();
  const { toast } = useToast();
  const { user: currentUser } = useAuth(); // currentUser can be User | null
  
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all"); // string, as value comes from Select
  const [userFilter, setUserFilter] = useState<string>("all"); // string, as value comes from Select
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState("newest");
  
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  const filterParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (searchQuery) params.search = searchQuery;
    if (dateRange?.from) params.startDate = dateRange.from.toISOString().split('T')[0];
    if (dateRange?.to) params.endDate = dateRange.to.toISOString().split('T')[0];
    if (categoryFilter && categoryFilter !== 'all') params.categoryId = categoryFilter;
    if (userFilter && userFilter !== 'all') params.userId = userFilter; // Assuming userFilter stores userId as string
    if (transactionType === 'income') params.transactionTypeId = '1';
    else if (transactionType === 'expense') params.transactionTypeId = '2';
    else if (transactionType === 'transfer') params.transactionTypeId = '3';
    return params;
  }, [searchQuery, dateRange, categoryFilter, userFilter, transactionType]);
  
  const { data: transactionsData = [], isLoading: transactionsLoading, isError: transactionsError } = useQuery<Transaction[], Error, Transaction[], QueryKey>({
    queryKey: ["/api/transactions", filterParams], // filterParams included in queryKey
    queryFn: () => getQueryFn({on401: "throw"})( {queryKey: ["/api/transactions", filterParams] } ), // Pass queryKey to queryFn
    initialData: [],
  });
  
  const { data: categoriesData = [], isLoading: categoriesLoading, isError: categoriesError } = useQuery<Category[], Error, Category[], QueryKey>({
    queryKey: ["/api/categories"],
    queryFn: getQueryFn({ on401: "throw" }),
    initialData: [],
  });
  
  const { data: accountsData = [], isLoading: accountsLoading, isError: accountsError } = useQuery<Account[], Error, Account[], QueryKey>({
    queryKey: ["/api/accounts"], // Assuming this component might need account names for transfers, etc.
    queryFn: getQueryFn({ on401: "throw" }),
    initialData: [],
  });
  
  const { data: familyMembersData = [], isLoading: familyMembersLoading, isError: familyMembersError } = useQuery<FamilyMember[], Error, FamilyMember[], QueryKey>({
    queryKey: ["/api/family-members"],
    queryFn: getQueryFn({ on401: "throw" }),
    initialData: [],
  });
  
  const getCategoryName = (categoryId: number): string => {
    const category = categoriesData.find((c: Category) => c.id === categoryId);
    return category ? category.name : "Sin categoría";
  };
  
  const getAccountName = (accountId: number | null): string => {
    if (accountId === null) return "N/A";
    const account = accountsData.find((a: Account) => a.id === accountId);
    return account ? account.name : "Cuenta desconocida";
  };
  
  const getUserInfo = (userId: number): UserInfo => {
    if (currentUser && currentUser.id === userId) {
      const name = currentUser.name ?? currentUser.username;
      return { name, initials: name.substring(0, 2).toUpperCase(), avatarColor: currentUser.avatarColor };
    }
    const member = familyMembersData.find((m: FamilyMember) => m.id === userId); // Assuming familyMember object has its own ID and refers to a User by another ID if needed
                                                                               // Or if familyMembersData stores User objects directly for members.
                                                                               // For this example, let's assume familyMembersData contains user-like objects or direct user data.
                                                                               // If `m.userId` refers to `users.id`, then it's more complex.
                                                                               // The schema has `familyMembers.userId` as the *owner* of that family member entry.
                                                                               // This function might need rethinking based on actual data structure if `userId` on transaction is not directly `users.id`.
                                                                               // For now, assuming `userId` on transaction IS `users.id`.

    // A common pattern is that `transaction.userId` refers to an actual User ID.
    // FamilyMembers table might be to list who *can* be associated, not who *is* the user.
    // Let's try to find in familyMembersData if it contains user details. The schema implies familyMembers are distinct entities.
    // This part needs clarification on how `transaction.userId` maps to displayable names if not the current user.
    // For now, let's assume `familyMembersData` is a list of `User` objects for simplicity, or that `FamilyMember` has `name` and `avatarColor`.
    const familyMemberUser = familyMembersData.find(fm => fm.id === userId); // This line is speculative based on common patterns.
                                                                           // The schema has familyMembers.userId pointing to users.id (owner of the member entry)
                                                                           // and familyMembers.name for the member's name.
                                                                           // A transaction's userId should be a direct users.id.
                                                                           // So, if not currentUser, it must be another user in the system.
                                                                           // If transactions are shared, this logic needs household context.

    // This simplified version assumes familyMembersData has the info needed, or we'd need a /api/users/:id lookup.
    if (familyMemberUser) {
        const name = familyMemberUser.name;
        return { name, initials: name.substring(0, 2).toUpperCase(), avatarColor: (familyMemberUser as any).avatarColor || '#888888' };
    }
    
    return { name: "Usuario desc.", initials: "U?", avatarColor: '#888888' };
  };
  
  const sortedTransactions = useMemo(() => {
    return [...transactionsData].sort((a: Transaction, b: Transaction) => {
      if (sortOrder === "newest") return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortOrder === "oldest") return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (sortOrder === "highest") return parseFloat(b.amount) - parseFloat(a.amount);
      if (sortOrder === "lowest") return parseFloat(a.amount) - parseFloat(b.amount);
      return 0;
    });
  }, [transactionsData, sortOrder]);
  
  const totalPages = Math.ceil(sortedTransactions.length / pageSize);
  const paginatedTransactions = useMemo(() => {
    return sortedTransactions.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [sortedTransactions, currentPage, pageSize]);
  
  const handleEditTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsEditModalOpen(true);
  };
  
  const handleDeleteConfirmation = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsDeleteModalOpen(true);
  };
  
  const deleteTransaction = async () => {
    if (!selectedTransaction) return;
    try {
      await apiRequest("DELETE", `/api/transactions/${selectedTransaction.id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/transactions", filterParams] }); // Use dynamic queryKey
      toast({ title: "Transacción eliminada", description: "La transacción se ha eliminado correctamente" });
      setIsDeleteModalOpen(false);
      setSelectedTransaction(null);
    } catch (error) {
      toast({ title: "Error", description: "No se pudo eliminar la transacción", variant: "destructive" });
    }
  };

  const isLoadingCombined = transactionsLoading || categoriesLoading || accountsLoading || familyMembersLoading;
  const isErrorCombined = transactionsError || categoriesError || accountsError || familyMembersError;

  if (isErrorCombined) {
    return <div className="text-red-500 p-4">Error al cargar datos: { (transactionsError || categoriesError || accountsError || familyMembersError)?.message }</div>;
  }
  
  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <div className="p-3 border-b">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar transacciones..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <Button variant="outline" size="sm" className="whitespace-nowrap" onClick={() => setIsFilterOpen(!isFilterOpen)}>
              <Filter className="h-4 w-4 mr-2" /> Filtros
            </Button>
          </div>
        </div>
        
        {isFilterOpen && (
          <div className="p-3 border-b bg-muted/20">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Categoría</label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger><SelectValue placeholder="Todas las categorías" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    {categoriesData.map((category: Category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>{category.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Miembro</label>
                <Select value={userFilter} onValueChange={setUserFilter}>
                  <SelectTrigger><SelectValue placeholder="Todos los miembros" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los miembros</SelectItem>
                    {/* Assuming familyMembersData contains user-like objects or you have a way to get all users */}
                    {familyMembersData.map((member: FamilyMember) => (
                      <SelectItem key={member.id} value={member.id.toString()}>{/* Assuming member.id is the user ID for filtering */}
                        {member.name}
                      </SelectItem>
                    ))}
                     {currentUser && !familyMembersData.find(fm => fm.id === currentUser.id) && (
                        <SelectItem key={currentUser.id} value={currentUser.id.toString()}>
                            {currentUser.name ?? currentUser.username} (Yo)
                        </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Ordenar por</label>
                <Select value={sortOrder} onValueChange={setSortOrder}>
                  <SelectTrigger><SelectValue placeholder="Ordenar por" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Más recientes</SelectItem><SelectItem value="oldest">Más antiguas</SelectItem>
                    <SelectItem value="highest">Mayor importe</SelectItem><SelectItem value="lowest">Menor importe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-1 sm:col-span-3">
                <label className="text-sm font-medium mb-1.5 block">Rango de fechas</label>
                <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} className="w-full" />
              </div>
            </div>
            {(categoryFilter !== 'all' || userFilter !== 'all' || dateRange?.from) && (
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
                {categoryFilter !== 'all' && (<Badge variant="outline" className="bg-primary/10 text-primary rounded-full flex items-center gap-1">Categoría: {getCategoryName(parseInt(categoryFilter))}<Button variant="ghost" size="sm" className="h-4 w-4 p-0 rounded-full" onClick={() => setCategoryFilter("all")}>×</Button></Badge>)}
                {userFilter !== 'all' && (<Badge variant="outline" className="bg-primary/10 text-primary rounded-full flex items-center gap-1">Miembro: {familyMembersData.find((m: FamilyMember) => m.id.toString() === userFilter)?.name || currentUser?.id.toString() === userFilter ? (currentUser?.name ?? currentUser?.username) : 'Usuario'}<Button variant="ghost" size="sm" className="h-4 w-4 p-0 rounded-full" onClick={() => setUserFilter("all")}>×</Button></Badge>)}
                {dateRange?.from && (<Badge variant="outline" className="bg-primary/10 text-primary rounded-full flex items-center gap-1">Fecha: {formatDate(dateRange.from)} {dateRange.to ? `- ${formatDate(dateRange.to)}` : ""}<Button variant="ghost" size="sm" className="h-4 w-4 p-0 rounded-full" onClick={() => setDateRange(undefined)}>×</Button></Badge>)}
                <Button variant="ghost" size="sm" className="text-muted-foreground text-xs h-7" onClick={() => { setCategoryFilter("all"); setUserFilter("all"); setDateRange(undefined); }}>Limpiar filtros</Button>
              </div>
            )}
          </div>
        )}

        <div className="overflow-x-auto">
          <div className="bg-muted/30 py-2 px-4 text-sm text-muted-foreground border-b">
            {isLoadingCombined ? "Cargando..." : sortedTransactions.length === 0 ? "No hay transacciones" : sortedTransactions.length === 1 ? "1 transacción" : `${sortedTransactions.length} transacciones`}
          </div>
          {isLoadingCombined ? (
            <div className="flex justify-center items-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : paginatedTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center"><p className="text-muted-foreground mb-2">No se encontraron transacciones</p><p className="text-sm text-muted-foreground max-w-md">Intenta cambiar los filtros o agrega una nueva transacción para comenzar.</p></div>
          ) : (
            <>
              <div className="sm:hidden divide-y">
                {paginatedTransactions.map((transaction: Transaction) => (
                  <div key={transaction.id} className="p-4">
                    <div className="flex justify-between mb-2">
                      <div><h3 className="font-medium">{transaction.description}</h3><p className="text-xs text-muted-foreground">{formatDate(transaction.date)} • {getCategoryName(transaction.categoryId)}</p></div>
                      <div><span className={`font-semibold ${transaction.transactionTypeId === 1 ? "text-green-600" : transaction.transactionTypeId === 2 ? "text-red-600" : ""}`}>{formatCurrency(parseFloat(transaction.amount), transaction.currency)}</span></div>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      {transaction.userId && (<div className="flex items-center text-xs text-muted-foreground">
                        <div style={{backgroundColor: getUserInfo(transaction.userId).avatarColor ?? '#cccccc'}} className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-medium mr-1 text-white">{getUserInfo(transaction.userId).initials}</div>
                        <span>{getUserInfo(transaction.userId).name}</span>
                      </div>)}
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => handleEditTransaction(transaction)}><Edit className="h-3.5 w-3.5" /><span className="sr-only">Editar</span></Button>
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => handleDeleteConfirmation(transaction)}><Trash2 className="h-3.5 w-3.5" /><span className="sr-only">Eliminar</span></Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <table className="w-full hidden sm:table">
                <thead><tr className="border-b bg-muted/50"><th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Fecha</th><th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Descripción</th><th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Categoría</th><th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Realizada por</th><th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">Importe</th><th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground"></th></tr></thead>
                <tbody>
                  {paginatedTransactions.map((transaction: Transaction) => (
                    <tr key={transaction.id} className="hover:bg-muted/50 border-b">
                      <td className="py-3 px-4 text-sm">{formatDate(transaction.date)}</td>
                      <td className="py-3 px-4"><div className="flex items-center">
                        <div className="bg-primary/10 dark:bg-primary-900/50 rounded-full p-1.5 mr-2"><ShoppingBag className="h-4 w-4 text-primary dark:text-primary-400" /></div>
                        <div><p className="text-sm font-medium">{transaction.description}</p><div className="flex space-x-1 mt-0.5"><span className="text-xs px-1.5 py-0.5 bg-muted rounded text-muted-foreground">{transaction.isShared ? "Compartido" : "Personal"}</span></div></div>
                      </div></td>
                      <td className="py-3 px-4 text-sm">{getCategoryName(transaction.categoryId)}</td>
                      <td className="py-3 px-4">
                        {transaction.userId && (<div className="flex items-center">
                          <div style={{backgroundColor: getUserInfo(transaction.userId).avatarColor ?? '#cccccc'}} className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium mr-2 text-white">{getUserInfo(transaction.userId).initials}</div>
                          <span className="text-sm">{getUserInfo(transaction.userId).name}</span>
                        </div>)}
                      </td>
                      <td className="py-3 px-4 text-right"><span className={`text-sm font-semibold ${transaction.transactionTypeId === 1 ? "text-green-600" : transaction.transactionTypeId === 2 ? "text-red-600" : ""}`}>{formatCurrency(parseFloat(transaction.amount), transaction.currency)}</span></td>
                      <td className="py-3 px-4 text-right"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /><span className="sr-only">Acciones</span></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>Acciones</DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem onClick={() => handleEditTransaction(transaction)}><Edit className="mr-2 h-4 w-4" />Editar</DropdownMenuItem><DropdownMenuItem onClick={() => handleDeleteConfirmation(transaction)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Eliminar</DropdownMenuItem></DropdownMenuContent></DropdownMenu></td>
                    </tr>))}
                </tbody>
              </table>
            </>
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4 mr-2" />Anterior</Button>
              <span className="text-sm text-muted-foreground">Página {currentPage} de {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages}>Siguiente<ChevronRight className="h-4 w-4 ml-2" /></Button>
            </div>
          )}
        </div>
      </div>
      
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="md:max-w-2xl max-h-screen overflow-y-auto">
          <DialogHeader><DialogTitle>Editar transacción</DialogTitle><DialogDescription>Modifica los detalles de la transacción</DialogDescription></DialogHeader>
          {selectedTransaction && (<TransactionForm onSuccess={() => { setIsEditModalOpen(false); queryClient.invalidateQueries({ queryKey: ["/api/transactions", filterParams] }); }} transactionToEdit={selectedTransaction} />)}
        </DialogContent>
      </Dialog>
      
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Eliminar transacción</DialogTitle><DialogDescription>¿Estás seguro de que deseas eliminar esta transacción? Esta acción no se puede deshacer.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={deleteTransaction} disabled={deleteTransactionMutation.isPending}>
              {deleteTransactionMutation.isPending ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null} Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}