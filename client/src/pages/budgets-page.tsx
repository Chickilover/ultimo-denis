import { useState, useMemo } from "react"; // useMemo already imported
import { useQuery, useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/use-currency";
import { Shell } from "@/components/layout/shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"; // Added CardDescription, CardFooter
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Checkbox } from "@/components/ui/checkbox";
import { calculateProgress } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, isValid as isValidDate } from "date-fns"; // isValidDate already imported
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  MoreVertical,
  PenLine,
  Trash2,
  Loader2,
  CalendarIcon,
  // InfoIcon, // Not used
  ThumbsUp,
  ThumbsDown,
  PlusCircle // Added PlusCircle
} from "lucide-react";
import type { Transaction, Category, Budget, InsertBudget } from "@shared/schema";
import { CategoryIcon } from "@/components/ui/category-icon"; // Assuming CategoryIcon is a valid component

// Budget form schema
const budgetFormSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  categoryId: z.coerce.number({
    required_error: "Selecciona una categoría",
    invalid_type_error: "Selecciona una categoría válida"
  }).positive("Selecciona una categoría válida"),
  amount: z.string().min(1, "El monto es requerido").refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {message: "Debe ser un número positivo"}),
  currency: z.string().min(1, "Selecciona una moneda"),
  period: z.string().min(1, "Selecciona un período"),
  isRollover: z.boolean().default(false),
  isShared: z.boolean().default(false),
  startDate: z.date({ required_error: "La fecha de inicio es requerida" }),
  endDate: z.date().optional().nullable(),
  paymentType: z.string().default("one-time"),
  paymentDay: z.coerce.number().int().min(1).max(31).optional().nullable(),
  installments: z.coerce.number().int().min(2).max(36).optional().nullable(), // Min 2 for installments
  status: z.string().default("pending"),
  approvalCount: z.number().default(0),
  rejectionCount: z.number().default(0),
});

type BudgetFormValues = z.infer<typeof budgetFormSchema>;

interface ProcessedBudgetItem extends Budget {
  categoryName?: string;
  categoryIcon?: string | null;
  categoryColor?: string;
  spent: number;
  progress: number;
  statusDisplay: "good" | "warning" | "danger" | "completed"; // Added 'completed'
}

export default function BudgetsPage() {
  const { toast } = useToast();
  const { formatCurrency, convertCurrency } = useCurrency();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("active");
  const [isNewBudgetOpen, setIsNewBudgetOpen] = useState(false);
  const [isEditBudgetOpen, setIsEditBudgetOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  
  const { data: budgetsData = [], isLoading: budgetsLoading, isError: budgetsIsError, error: budgetsErrorObj } = useQuery<Budget[], Error, Budget[], QueryKey>({
    queryKey: ["/api/budgets"], queryFn: getQueryFn({ on401: "throw" }), initialData: [],
  });
  
  const { data: categoriesData = [], isLoading: categoriesLoading } = useQuery<Category[], Error, Category[], QueryKey>({
    queryKey: ["/api/categories"], queryFn: getQueryFn({ on401: "throw" }), initialData: [],
  });
  
  const { data: transactionsData = [], isLoading: transactionsLoading } = useQuery<Transaction[], Error, Transaction[], QueryKey>({
    queryKey: ["/api/transactions"], queryFn: getQueryFn({ on401: "throw" }), initialData: [],
  });
  
  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: { name: "", categoryId: undefined, amount: "", currency: "UYU", period: "monthly", isRollover: false, isShared: false, startDate: new Date(), endDate: null, paymentType: "one-time", paymentDay: 1, installments: 2, status: "pending", approvalCount: 0, rejectionCount: 0 },
  });
  
  const editForm = useForm<BudgetFormValues>({ resolver: zodResolver(budgetFormSchema) });
  
  const createBudgetMutation = useMutation<Budget, Error, InsertBudget>({
    mutationFn: async (data) => apiRequest<Budget>("POST", "/api/budgets", data),
    onSuccess: (newBudget) => {
      queryClient.invalidateQueries({ queryKey: ["/api/budgets"] });
      toast({ title: "Proyecto creado", description: `El proyecto "${newBudget.name}" se ha creado.` });
      setIsNewBudgetOpen(false); form.reset();
    },
    onError: (error) => toast({ title: "Error", description: `Error al crear: ${error.message}`, variant: "destructive" }),
  });
  
  const updateBudgetMutation = useMutation<Budget, Error, { id: number; data: Partial<InsertBudget> }>({
    mutationFn: async ({ id, data }) => apiRequest<Budget>("PUT", `/api/budgets/${id}`, data),
    onSuccess: (updatedBudget) => {
      queryClient.invalidateQueries({ queryKey: ["/api/budgets"] });
      toast({ title: "Proyecto actualizado", description: `El proyecto "${updatedBudget.name}" se ha actualizado.` });
      setIsEditBudgetOpen(false);
    },
    onError: (error) => toast({ title: "Error", description: `Error al actualizar: ${error.message}`, variant: "destructive" }),
  });
  
  const deleteBudgetMutation = useMutation<void, Error, number>({
    mutationFn: async (id) => apiRequest<void>("DELETE", `/api/budgets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budgets"] });
      toast({ title: "Proyecto eliminado" });
      setIsDeleteDialogOpen(false); setSelectedBudget(null);
    },
    onError: (error) => toast({ title: "Error", description: `Error al eliminar: ${error.message}`, variant: "destructive" }),
  });
  
  const approveBudgetMutation = useMutation<Budget, Error, number>({
    mutationFn: async (id) => apiRequest<Budget>("PATCH", `/api/budgets/${id}/approve`, {}),
    onSuccess: (approvedBudget) => { queryClient.invalidateQueries({ queryKey: ["/api/budgets"] }); toast({title: "Voto registrado", description: `Aprobaste "${approvedBudget.name}".`})},
    onError: (error) => toast({ title: "Error", description: `Error al aprobar: ${error.message}`, variant: "destructive" }),
  });
  
  const rejectBudgetMutation = useMutation<Budget, Error, number>({
    mutationFn: async (id) => apiRequest<Budget>("PATCH", `/api/budgets/${id}/reject`, {}),
    onSuccess: (rejectedBudget) => { queryClient.invalidateQueries({ queryKey: ["/api/budgets"] }); toast({title: "Voto registrado", description: `Rechazaste "${rejectedBudget.name}".`})},
    onError: (error) => toast({ title: "Error", description: `Error al rechazar: ${error.message}`, variant: "destructive" }),
  });
  
  const onSubmit = (data: BudgetFormValues) => {
    const budgetToCreate: InsertBudget = {
      ...data,
      amount: data.amount.toString(), // API expects string for numeric
      userId: 0, // This will be set on the server from req.user.id
      paymentDay: data.paymentDay ? Number(data.paymentDay) : null,
      installments: data.installments ? Number(data.installments) : null,
      endDate: data.endDate || null, // Ensure null if undefined
    };
    createBudgetMutation.mutate(budgetToCreate);
  };
  
  const onEditSubmit = (data: BudgetFormValues) => {
    if (!selectedBudget) return;
    const budgetToUpdate: Partial<InsertBudget> = {
      ...data,
      amount: data.amount.toString(),
      paymentDay: data.paymentDay ? Number(data.paymentDay) : null,
      installments: data.installments ? Number(data.installments) : null,
      endDate: data.endDate || null,
    };
    updateBudgetMutation.mutate({ id: selectedBudget.id, data: budgetToUpdate });
  };
  
  const handleDeleteBudget = () => {
    if (!selectedBudget) return;
    deleteBudgetMutation.mutate(selectedBudget.id);
  };
  
  const handleEditBudget = (budget: Budget) => {
    setSelectedBudget(budget);
    editForm.reset({
      ...budget,
      amount: budget.amount.toString(),
      startDate: new Date(budget.startDate),
      endDate: budget.endDate ? new Date(budget.endDate) : null,
      paymentDay: budget.paymentDay ?? undefined, // form expects number or undefined
      installments: budget.installments ?? undefined,
    });
    setIsEditBudgetOpen(true);
  };
  
  const budgetsWithProgress = useMemo((): ProcessedBudgetItem[] => {
    if (!budgetsData.length || !categoriesData.length) return [];
    const now = new Date();
    return budgetsData.map((budget: Budget): ProcessedBudgetItem => {
      const category = categoriesData.find((cat: Category) => cat.id === budget.categoryId);
      const budgetStartDate = new Date(budget.startDate);
      let budgetEndDate = budget.endDate ? new Date(budget.endDate) : null;

      if (budget.period === "monthly") {
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        // If budget start date is in a future month of the same year, or a past year, use that.
        // Otherwise, if it's this year and month or a past month, use current month for filtering.
        const effectiveStartDate = (budgetStartDate.getFullYear() < currentYear || (budgetStartDate.getFullYear() === currentYear && budgetStartDate.getMonth() <= currentMonth))
            ? new Date(currentYear, currentMonth, 1)
            : budgetStartDate;
        const effectiveEndDate = new Date(effectiveStartDate.getFullYear(), effectiveStartDate.getMonth() + 1, 0);
        budgetEndDate = budgetEndDate && budgetEndDate < effectiveEndDate ? budgetEndDate : effectiveEndDate;

      } else if (budget.period === "yearly") {
         // Similar logic for yearly if needed, or use budget.startDate/endDate
      }

      const relevantTransactions = transactionsData.filter((tx: Transaction) => {
        const txDate = new Date(tx.date);
        return tx.categoryId === budget.categoryId && tx.transactionTypeId === 2 &&
               txDate >= budgetStartDate && (budgetEndDate ? txDate <= budgetEndDate : true);
      });
      
      const spent = relevantTransactions.reduce((sum: number, tx: Transaction) => {
        let txAmount = parseFloat(tx.amount);
        if (tx.currency !== budget.currency) txAmount = convertCurrency(txAmount, tx.currency, budget.currency);
        return sum + txAmount;
      }, 0);

      const budgetAmount = parseFloat(budget.amount);
      const progress = calculateProgress(spent, budgetAmount);
      let statusDisplay: ProcessedBudgetItem['statusDisplay'] = "good";
      if (budget.status === 'approved' && progress >= 100 && spent <= budgetAmount) statusDisplay = "completed";
      else if (progress >= 100) statusDisplay = "danger"; // Exceeded
      else if (progress >= 75) statusDisplay = "warning";

      return {
        ...budget, categoryName: category?.name || "N/A", categoryIcon: category?.icon, categoryColor: category?.color,
        spent, progress, statusDisplay,
      };
    }).sort((a, b) => a.progress - b.progress); // Sort by progress, less completed first
  }, [budgetsData, transactionsData, categoriesData, convertCurrency]);
  
  const getCategoryName = (categoryId: number): string => categoriesData.find((cat) => cat.id === categoryId)?.name || "N/A";
  const getPeriodName = (period: string): string => ({ monthly: "Mensual", weekly: "Semanal", biweekly: "Quincenal", yearly: "Anual" }[period] || period);
  
  const activeFilteredBudgets = useMemo(() => budgetsWithProgress.filter(b => b.statusDisplay !== 'completed' && (!b.endDate || new Date(b.endDate) >= new Date())), [budgetsWithProgress]);
  const completedFilteredBudgets = useMemo(() => budgetsWithProgress.filter(b => b.statusDisplay === 'completed' || (b.endDate && new Date(b.endDate) < new Date())), [budgetsWithProgress]);

  const currentBudgetsToDisplay = activeTab === 'active' ? activeFilteredBudgets : completedFilteredBudgets;

  const isLoadingCombined = budgetsLoading || transactionsLoading || categoriesLoading;

  if (isLoadingCombined) return <Shell><div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></Shell>;
  if (budgetsIsError) return <Shell><div className="text-red-500 p-4">Error: {budgetsErrorObj?.message}</div></Shell>;

  return (
    <Shell>
      <div className="container px-4 py-6 max-w-7xl">
        <PageHeader title="Proyectos de Gasto" description="Planifica y sigue tus gastos recurrentes o específicos." actions={
          <Button onClick={() => { form.reset(); setIsNewBudgetOpen(true); }} className="bg-primary hover:bg-primary/90"><PlusCircle className="mr-2 h-4 w-4" />Nuevo Proyecto</Button>
        }/>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid w-full max-w-md grid-cols-2"><TabsTrigger value="active">Activos</TabsTrigger><TabsTrigger value="completed">Completados</TabsTrigger></TabsList>
        </Tabs>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentBudgetsToDisplay.length === 0 ? (
            <div className="col-span-full text-center p-8"><p className="text-muted-foreground mb-4">No hay proyectos {activeTab === 'active' ? 'activos' : 'completados'}.</p><Button onClick={() => setIsNewBudgetOpen(true)} className="bg-primary hover:bg-primary/90">Crear nuevo proyecto</Button></div>
          ) : (
            currentBudgetsToDisplay.map((budget) => {
              const { spent, progress, remaining } = calculateBudgetProgress(budget); // Recalculate for safety, or use budget.spent etc.
              const statusColor = budget.statusDisplay === 'danger' ? 'bg-red-500' : budget.statusDisplay === 'warning' ? 'bg-amber-500' : budget.statusDisplay === 'completed' ? 'bg-blue-500' : 'bg-green-500';
              return (
                <Card key={budget.id} className="overflow-hidden flex flex-col">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2"><CategoryIcon name={budget.categoryName || budget.name} icon={budget.categoryIcon} color={budget.categoryColor} size="md" className="flex-shrink-0"/>
                        <div><CardTitle className="text-base truncate" title={budget.name}>{budget.name}</CardTitle><p className="text-xs text-muted-foreground">{budget.categoryName} · {getPeriodName(budget.period)}</p></div>
                      </div>
                      <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end"><DropdownMenuLabel>Acciones</DropdownMenuLabel><DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleEditBudget(budget)}><PenLine className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setSelectedBudget(budget); setIsDeleteDialogOpen(true); }} className="text-red-500 dark:text-red-400"><Trash2 className="mr-2 h-4 w-4" />Eliminar</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 flex-grow">
                    <div className="flex justify-between items-baseline"><span className="text-2xl font-bold">{formatCurrency(spent, budget.currency)}</span><span className="text-sm text-muted-foreground">/ {formatCurrency(parseFloat(budget.amount), budget.currency)}</span></div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs"><span className="text-muted-foreground">Progreso</span><span className={`font-semibold ${budget.statusDisplay === 'danger' ? 'text-red-500' : budget.statusDisplay === 'warning' ? 'text-amber-500' : 'text-green-500'}`}>{progress.toFixed(0)}%</span></div>
                      <Progress value={progress} className={`h-2 ${statusColor}`} />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {budget.statusDisplay === 'danger' ? `Excedido por ${formatCurrency(spent - parseFloat(budget.amount), budget.currency)}` : budget.statusDisplay === 'completed' ? 'Completado!' : `Restante: ${formatCurrency(parseFloat(budget.amount) - spent, budget.currency)}`}
                    </div>
                     <div className="flex flex-wrap gap-1 pt-1">
                        {budget.isShared && (<Badge variant="outline" className="text-xs">Compartido</Badge>)}
                        {budget.status === 'pending' && (<Badge variant="outline" className="text-xs border-amber-500 text-amber-600">Pendiente ({budget.approvalCount}✓ {budget.rejectionCount}✗)</Badge>)}
                        {budget.status === 'approved' && (<Badge variant="outline" className="text-xs border-green-500 text-green-600">Aprobado ({budget.approvalCount}✓)</Badge>)}
                        {budget.status === 'rejected' && (<Badge variant="outline" className="text-xs border-red-500 text-red-600">Rechazado ({budget.rejectionCount}✗)</Badge>)}
                      </div>
                  </CardContent>
                  {budget.status === 'pending' && budget.isShared && (
                    <CardFooter className="border-t pt-3 flex gap-2">
                      <Button size="sm" variant="outline" className="w-full border-green-500 hover:bg-green-500/10 text-green-600" onClick={() => approveBudgetMutation.mutate(budget.id)} disabled={approveBudgetMutation.isPending}><ThumbsUp className="h-4 w-4 mr-1" /> Aprobar {approveBudgetMutation.isPending ? <Loader2 className="ml-1 h-4 w-4 animate-spin"/> : budget.approvalCount > 0 && `(${budget.approvalCount})`}</Button>
                      <Button size="sm" variant="outline" className="w-full border-red-500 hover:bg-red-500/10 text-red-600" onClick={() => rejectBudgetMutation.mutate(budget.id)} disabled={rejectBudgetMutation.isPending}><ThumbsDown className="h-4 w-4 mr-1" /> Rechazar {rejectBudgetMutation.isPending ? <Loader2 className="ml-1 h-4 w-4 animate-spin"/> : budget.rejectionCount > 0 && `(${budget.rejectionCount})`}</Button>
                    </CardFooter>
                  )}
                </Card>
              );
            })
          )}
        </div>
        
        <Dialog open={isNewBudgetOpen} onOpenChange={setIsNewBudgetOpen}>
          <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Nuevo Proyecto</DialogTitle><DialogDescription>Planifica y controla tus gastos.</DialogDescription></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
                <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nombre</FormLabel><FormControl><Input placeholder="Ej: Supermercado Mensual" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="categoryId" render={({ field }) => (<FormItem><FormLabel>Categoría</FormLabel><Select value={field.value?.toString()} onValueChange={(value) => field.onChange(parseInt(value))}><FormControl><SelectTrigger><SelectValue placeholder="Categoría" /></SelectTrigger></FormControl><SelectContent>{categoriesData.filter((cat) => !cat.isIncome).map((category) => (<SelectItem key={category.id} value={category.id.toString()}>{category.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="amount" render={({ field }) => (<FormItem><FormLabel>Monto</FormLabel><FormControl><CurrencyInput value={field.value} onChange={field.onChange} currency={form.watch("currency") as "UYU" | "USD"} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="currency" render={({ field }) => (<FormItem><FormLabel>Moneda</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue placeholder="Moneda" /></SelectTrigger></FormControl><SelectContent><SelectItem value="UYU">UYU</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                </div>
                <FormField control={form.control} name="period" render={({ field }) => (<FormItem><FormLabel>Período</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue placeholder="Período" /></SelectTrigger></FormControl><SelectContent><SelectItem value="monthly">Mensual</SelectItem><SelectItem value="weekly">Semanal</SelectItem><SelectItem value="biweekly">Quincenal</SelectItem><SelectItem value="yearly">Anual</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="startDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Inicio</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "dd/MM/yy") : <span>Fecha</span>} <CalendarIcon className="ml-auto h-4 w-4 op-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} locale={es} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="endDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Fin (Op.)</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "dd/MM/yy") : <span>Fecha</span>} <CalendarIcon className="ml-auto h-4 w-4 op-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value ?? undefined} onSelect={field.onChange} locale={es} disabled={(d) => d < (form.getValues("startDate")||new Date(0))} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                </div>
                <FormField control={form.control} name="isRollover" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><FormLabel>Acumular saldo</FormLabel><FormDescription>Saldo no gastado se acumula.</FormDescription></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                <FormField control={form.control} name="isShared" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><FormLabel>Compartido</FormLabel><FormDescription>Visible para el hogar y requiere aprobación.</FormDescription></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                <FormField control={form.control} name="paymentType" render={({ field }) => (<FormItem><FormLabel>Tipo de pago</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue placeholder="Tipo de pago" /></SelectTrigger></FormControl><SelectContent><SelectItem value="one-time">Único</SelectItem><SelectItem value="monthly">Mensual</SelectItem><SelectItem value="installments">Cuotas</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                {form.watch("paymentType") === "monthly" && (<FormField control={form.control} name="paymentDay" render={({ field }) => (<FormItem><FormLabel>Día de pago</FormLabel><FormControl><Input type="number" min="1" max="31" placeholder="Ej: 10" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === "" ? null : parseInt(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />)}
                {form.watch("paymentType") === "installments" && (<div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="paymentDay" render={({ field }) => (<FormItem><FormLabel>Día de cuota</FormLabel><FormControl><Input type="number" min="1" max="31" placeholder="Ej: 10" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === "" ? null : parseInt(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="installments" render={({ field }) => (<FormItem><FormLabel>Nº Cuotas</FormLabel><FormControl><Input type="number" min="2" max="36" placeholder="Ej: 12" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === "" ? null : parseInt(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
                </div>)}
                <DialogFooter><Button type="button" variant="outline" onClick={() => setIsNewBudgetOpen(false)}>Cancelar</Button><Button type="submit" className="bg-primary hover:bg-primary/90" disabled={createBudgetMutation.isPending}>{createBudgetMutation.isPending && (<Loader2 className="mr-2 h-4 w-4 animate-spin" />)}Crear</Button></DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        
        <Dialog open={isEditBudgetOpen} onOpenChange={setIsEditBudgetOpen}>
          <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Editar Proyecto</DialogTitle><DialogDescription>Modifica los detalles.</DialogDescription></DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4 py-2">
                {/* Fields similar to New Budget Dialog, pre-filled by handleEditBudget */}
                <FormField control={editForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nombre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={editForm.control} name="categoryId" render={({ field }) => (<FormItem><FormLabel>Categoría</FormLabel><Select value={field.value?.toString()} onValueChange={(value) => field.onChange(parseInt(value))}><FormControl><SelectTrigger><SelectValue placeholder="Categoría" /></SelectTrigger></FormControl><SelectContent>{categoriesData.filter((cat) => !cat.isIncome).map((category) => (<SelectItem key={category.id} value={category.id.toString()}>{category.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                <div className="grid grid-cols-2 gap-4">
                <FormField control={editForm.control} name="amount" render={({ field }) => (<FormItem><FormLabel>Monto</FormLabel><FormControl><CurrencyInput value={field.value} onChange={field.onChange} currency={editForm.watch("currency") as "UYU" | "USD"} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={editForm.control} name="currency" render={({ field }) => (<FormItem><FormLabel>Moneda</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue placeholder="Moneda" /></SelectTrigger></FormControl><SelectContent><SelectItem value="UYU">UYU</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                </div>
                <FormField control={editForm.control} name="period" render={({ field }) => (<FormItem><FormLabel>Período</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue placeholder="Período" /></SelectTrigger></FormControl><SelectContent><SelectItem value="monthly">Mensual</SelectItem><SelectItem value="weekly">Semanal</SelectItem><SelectItem value="biweekly">Quincenal</SelectItem><SelectItem value="yearly">Anual</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={editForm.control} name="startDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Inicio</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "dd/MM/yy") : <span>Fecha</span>} <CalendarIcon className="ml-auto h-4 w-4 op-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} locale={es} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                  <FormField control={editForm.control} name="endDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Fin (Op.)</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "dd/MM/yy") : <span>Fecha</span>} <CalendarIcon className="ml-auto h-4 w-4 op-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value ?? undefined} onSelect={field.onChange} locale={es} disabled={(d) => d < (editForm.getValues("startDate")||new Date(0))} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                </div>
                <FormField control={editForm.control} name="isRollover" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><FormLabel>Acumular saldo</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                <FormField control={editForm.control} name="isShared" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><FormLabel>Compartido</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                <FormField control={editForm.control} name="paymentType" render={({ field }) => (<FormItem><FormLabel>Tipo de pago</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue placeholder="Tipo de pago" /></SelectTrigger></FormControl><SelectContent><SelectItem value="one-time">Único</SelectItem><SelectItem value="monthly">Mensual</SelectItem><SelectItem value="installments">Cuotas</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                {editForm.watch("paymentType") === "monthly" && (<FormField control={editForm.control} name="paymentDay" render={({ field }) => (<FormItem><FormLabel>Día de pago</FormLabel><FormControl><Input type="number" min="1" max="31" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === "" ? null : parseInt(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />)}
                {editForm.watch("paymentType") === "installments" && (<div className="grid grid-cols-2 gap-4">
                  <FormField control={editForm.control} name="paymentDay" render={({ field }) => (<FormItem><FormLabel>Día de cuota</FormLabel><FormControl><Input type="number" min="1" max="31" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === "" ? null : parseInt(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={editForm.control} name="installments" render={({ field }) => (<FormItem><FormLabel>Nº Cuotas</FormLabel><FormControl><Input type="number" min="2" max="36" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === "" ? null : parseInt(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
                </div>)}
                <DialogFooter><Button type="submit" className="bg-primary hover:bg-primary/90" disabled={updateBudgetMutation.isPending}>{updateBudgetMutation.isPending && (<Loader2 className="mr-2 h-4 w-4 animate-spin" />)}Guardar</Button></DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent><DialogHeader><DialogTitle>Eliminar proyecto</DialogTitle><DialogDescription>¿Seguro? Esta acción no se puede deshacer.</DialogDescription></DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0"><Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancelar</Button><Button variant="destructive" onClick={handleDeleteBudget} disabled={deleteBudgetMutation.isPending}>{deleteBudgetMutation.isPending && (<Loader2 className="mr-2 h-4 w-4 animate-spin" />)}Eliminar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Shell>
  );
}
