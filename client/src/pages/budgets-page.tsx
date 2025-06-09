import { useState } from "react";
import { useQuery, useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/use-currency";
import { Shell } from "@/components/layout/shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  MoreVertical,
  PenLine,
  Trash2,
  Loader2,
  CalendarIcon,
  InfoIcon, // Not used, consider removing
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import type { Transaction, Category, Budget, InsertBudget } from "@shared/schema"; // Import types

// Budget form schema
const budgetFormSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  categoryId: z.coerce.number({ // Coerce to number as select passes string
    required_error: "Selecciona una categoría",
    invalid_type_error: "Selecciona una categoría válida"
  }).positive("Selecciona una categoría válida"),
  amount: z.string().min(1, "El monto es requerido"), // Keep as string for CurrencyInput, will be parsed
  currency: z.string().min(1, "Selecciona una moneda"),
  period: z.string().min(1, "Selecciona un período"),
  isRollover: z.boolean().default(false),
  isShared: z.boolean().default(false),
  startDate: z.date({
    required_error: "La fecha de inicio es requerida",
  }),
  endDate: z.date().optional().nullable(), // Allow null for optional date
  paymentType: z.string().default("one-time"),
  paymentDay: z.coerce.number().optional().nullable(),
  installments: z.coerce.number().optional().nullable(),
  status: z.string().default("pending"),
  approvalCount: z.number().default(0),
  rejectionCount: z.number().default(0),
});

type BudgetFormValues = z.infer<typeof budgetFormSchema>;

export default function BudgetsPage() {
  const { toast } = useToast();
  const { formatCurrency, convertCurrency } = useCurrency(); // Added convertCurrency
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("active");
  const [isNewBudgetOpen, setIsNewBudgetOpen] = useState(false);
  const [isEditBudgetOpen, setIsEditBudgetOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  
  const { data: budgetsData = [], isLoading: budgetsLoading } = useQuery<Budget[], Error, Budget[], QueryKey>({
    queryKey: ["/api/budgets"],
    queryFn: getQueryFn({ on401: "throw" }),
    initialData: [],
  });
  
  const { data: categoriesData = [] } = useQuery<Category[], Error, Category[], QueryKey>({
    queryKey: ["/api/categories"],
    queryFn: getQueryFn({ on401: "throw" }),
    initialData: [],
  });
  
  const { data: transactionsData = [] } = useQuery<Transaction[], Error, Transaction[], QueryKey>({
    queryKey: ["/api/transactions"], // Consider adding filters if needed for performance
    queryFn: getQueryFn({ on401: "throw" }),
    initialData: [],
  });
  
  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: {
      name: "",
      categoryId: undefined, // Will be number after selection
      amount: "",
      currency: "UYU",
      period: "monthly",
      isRollover: false,
      isShared: false,
      startDate: new Date(),
      endDate: null,
      paymentType: "one-time",
      paymentDay: 1,
      installments: 1,
      status: "pending",
      approvalCount: 0,
      rejectionCount: 0,
    },
  });
  
  const editForm = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetFormSchema),
    // Default values will be set by handleEditBudget
  });
  
  const createBudgetMutation = useMutation<Budget, Error, InsertBudget>({
    mutationFn: async (data) => apiRequest("POST", "/api/budgets", data).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budgets"] });
      toast({ title: "Proyecto creado", description: "El proyecto se ha creado correctamente" });
      setIsNewBudgetOpen(false);
      form.reset();
    },
    onError: (error) => toast({ title: "Error", description: `Error al crear el proyecto: ${error.message}`, variant: "destructive" }),
  });
  
  const updateBudgetMutation = useMutation<Budget, Error, { id: number; data: Partial<InsertBudget> }>({
    mutationFn: async ({ id, data }) => apiRequest("PUT", `/api/budgets/${id}`, data).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budgets"] });
      toast({ title: "Proyecto actualizado", description: "El proyecto se ha actualizado correctamente" });
      setIsEditBudgetOpen(false);
    },
    onError: (error) => toast({ title: "Error", description: `Error al actualizar el proyecto: ${error.message}`, variant: "destructive" }),
  });
  
  const deleteBudgetMutation = useMutation<void, Error, number>({
    mutationFn: async (id) => apiRequest("DELETE", `/api/budgets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budgets"] });
      toast({ title: "Proyecto eliminado", description: "El proyecto se ha eliminado correctamente" });
      setIsDeleteDialogOpen(false);
    },
    onError: (error) => toast({ title: "Error", description: `Error al eliminar el proyecto: ${error.message}`, variant: "destructive" }),
  });
  
  const approveBudgetMutation = useMutation<Budget, Error, number>({
    mutationFn: async (id) => apiRequest("PATCH", `/api/budgets/${id}/approve`, {}).then(res => res.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/budgets"] }),
    onError: (error) => toast({ title: "Error", description: `Error al aprobar el proyecto: ${error.message}`, variant: "destructive" }),
  });
  
  const rejectBudgetMutation = useMutation<Budget, Error, number>({
    mutationFn: async (id) => apiRequest("PATCH", `/api/budgets/${id}/reject`, {}).then(res => res.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/budgets"] }),
    onError: (error) => toast({ title: "Error", description: `Error al rechazar el proyecto: ${error.message}`, variant: "destructive" }),
  });
  
  const onSubmit = (data: BudgetFormValues) => {
    // Convert amount to string for InsertBudget, assuming schema expects string for numeric
    const budgetToCreate: InsertBudget = {
      ...data,
      amount: data.amount.toString(), // CurrencyInput gives string, ensure it is
      paymentDay: data.paymentDay ? Number(data.paymentDay) : null,
      installments: data.installments ? Number(data.installments) : null,
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
      name: budget.name,
      categoryId: budget.categoryId,
      amount: budget.amount.toString(), // amount is string in Budget schema
      currency: budget.currency,
      period: budget.period,
      isRollover: budget.isRollover,
      isShared: budget.isShared,
      startDate: new Date(budget.startDate), // budget.startDate is string | Date
      endDate: budget.endDate ? new Date(budget.endDate) : null,
      paymentType: budget.paymentType ?? "one-time",
      paymentDay: budget.paymentDay ?? 1,
      installments: budget.installments ?? 1,
      status: budget.status,
      approvalCount: budget.approvalCount ?? 0,
      rejectionCount: budget.rejectionCount ?? 0,
    });
    setIsEditBudgetOpen(true);
  };
  
  const calculateBudgetProgress = (budget: Budget) => {
    const relevantTransactions = transactionsData.filter((tx: Transaction) => {
      if (tx.transactionTypeId !== 2) return false; // Only expenses
      if (tx.categoryId !== budget.categoryId) return false;
      
      const txDate = new Date(tx.date);
      const budgetStartDate = new Date(budget.startDate);
      
      if (budget.period === "monthly") {
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return txDate >= firstDayOfMonth && txDate <= lastDayOfMonth;
      }
      
      const budgetEndDate = budget.endDate ? new Date(budget.endDate) : null;
      if (budgetEndDate) return txDate >= budgetStartDate && txDate <= budgetEndDate;
      return txDate >= budgetStartDate;
    });
    
    const spent = relevantTransactions.reduce((sum: number, tx: Transaction) => {
      let txAmount = parseFloat(tx.amount);
      if (tx.currency !== budget.currency) {
        txAmount = convertCurrency(txAmount, tx.currency, budget.currency);
      }
      return sum + txAmount;
    }, 0);
    
    const budgetAmount = parseFloat(budget.amount);
    return {
      spent,
      progress: calculateProgress(spent, budgetAmount),
      remaining: Math.max(0, budgetAmount - spent),
    };
  };
  
  const getCategoryName = (categoryId: number): string => {
    const category = categoriesData.find((cat: Category) => cat.id === categoryId);
    return category ? category.name : "Desconocida";
  };
  
  const getPeriodName = (period: string): string => {
    const periods: Record<string, string> = { "monthly": "Mensual", "weekly": "Semanal", "biweekly": "Quincenal", "yearly": "Anual" };
    return periods[period] || period;
  };
  
  const filteredBudgets = budgetsData.filter((budget: Budget) => {
    if (activeTab === "active") return !budget.endDate || new Date(budget.endDate) >= new Date();
    if (activeTab === "completed") return budget.endDate && new Date(budget.endDate) < new Date();
    return true; // Should not happen if activeTab is one of the two
  });
  
  return (
    <Shell>
      <div className="container px-4 py-6 max-w-7xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Proyectos</h1>
          <Button onClick={() => setIsNewBudgetOpen(true)} className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
            + Nuevo Proyecto
          </Button>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="active">Activos</TabsTrigger>
            <TabsTrigger value="completed">Completados</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgetsLoading ? (
            <div className="col-span-full flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : filteredBudgets.length === 0 ? (
            <div className="col-span-full text-center p-8">
              <p className="text-muted-foreground mb-4">No hay proyectos para mostrar</p>
              <Button onClick={() => setIsNewBudgetOpen(true)} className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                Crear nuevo proyecto
              </Button>
            </div>
          ) : (
            filteredBudgets.map((budget: Budget) => {
              const { spent, progress, remaining } = calculateBudgetProgress(budget);
              const isExceeded = progress > 100;
              const statusColor = isExceeded ? "bg-red-500" : progress > 75 ? "bg-amber-500" : "bg-green-500";
              
              return (
                <Card key={budget.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-base">{budget.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">{getCategoryName(budget.categoryId)} · {getPeriodName(budget.period)}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Acciones</DropdownMenuLabel><DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleEditBudget(budget)}><PenLine className="mr-2 h-4 w-4" /><span>Editar</span></DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setSelectedBudget(budget); setIsDeleteDialogOpen(true); }} className="text-red-600 dark:text-red-400">
                            <Trash2 className="mr-2 h-4 w-4" /><span>Eliminar</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div><p className="text-sm text-muted-foreground">Proyecto</p><p className="text-lg font-bold">{formatCurrency(parseFloat(budget.amount), budget.currency)}</p></div>
                        <div className="text-right"><p className="text-sm text-muted-foreground">Gastado</p><p className="text-lg font-bold">{formatCurrency(spent, budget.currency)}</p></div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs"><span>Progreso</span><span className={isExceeded ? "text-red-500" : ""}>{progress.toFixed(0)}%</span></div>
                        <Progress value={Math.min(100, progress)} className={statusColor} />
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span>{isExceeded ? "Excedido" : "Restante"}</span>
                        <span className={isExceeded ? "text-red-500 font-semibold" : "font-medium"}>
                          {isExceeded ? `+${formatCurrency(spent - parseFloat(budget.amount), budget.currency)}` : formatCurrency(remaining, budget.currency)}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {budget.isShared && (<div className="text-xs bg-primary/10 text-primary py-1 px-2 rounded-full inline-block">Compartido</div>)}
                        {budget.status === 'pending' && (<div className="text-xs bg-amber-500/10 text-amber-600 py-1 px-2 rounded-full inline-block">Pendiente {budget.approvalCount > 0 || budget.rejectionCount > 0 ? `(${budget.approvalCount} ✓, ${budget.rejectionCount} ✗)` : ''}</div>)}
                        {budget.status === 'approved' && (<div className="text-xs bg-green-500/10 text-green-600 py-1 px-2 rounded-full inline-block">Aprobado ({budget.approvalCount} ✓)</div>)}
                        {budget.status === 'rejected' && (<div className="text-xs bg-red-500/10 text-red-600 py-1 px-2 rounded-full inline-block">Rechazado ({budget.rejectionCount} ✗)</div>)}
                      </div>
                      {budget.status === 'pending' && budget.isShared && (
                        <div className="flex gap-2 mt-3">
                          <Button size="sm" variant="outline" className="w-full border-green-500 hover:bg-green-500/10 text-green-600" onClick={() => approveBudgetMutation.mutate(budget.id)} disabled={approveBudgetMutation.isPending}>
                            <ThumbsUp className="h-4 w-4 mr-1" /> Aprobar {approveBudgetMutation.isPending ? <Loader2 className="ml-2 h-4 w-4 animate-spin"/> : budget.approvalCount > 0 && `(${budget.approvalCount})`}
                          </Button>
                          <Button size="sm" variant="outline" className="w-full border-red-500 hover:bg-red-500/10 text-red-600" onClick={() => rejectBudgetMutation.mutate(budget.id)} disabled={rejectBudgetMutation.isPending}>
                            <ThumbsDown className="h-4 w-4 mr-1" /> Rechazar {rejectBudgetMutation.isPending ? <Loader2 className="ml-2 h-4 w-4 animate-spin"/> : budget.rejectionCount > 0 && `(${budget.rejectionCount})`}
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
        
        <Dialog open={isNewBudgetOpen} onOpenChange={setIsNewBudgetOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Nuevo Proyecto</DialogTitle><DialogDescription>Crea un nuevo proyecto para planificar y controlar tus gastos</DialogDescription></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nombre</FormLabel><FormControl><Input placeholder="Ej: Supermercado Mensual" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="categoryId" render={({ field }) => (
                  <FormItem><FormLabel>Categoría</FormLabel>
                    <Select value={field.value?.toString()} onValueChange={(value) => field.onChange(parseInt(value))}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar categoría" /></SelectTrigger></FormControl>
                      <SelectContent>{categoriesData.filter((cat) => !cat.isIncome).map((category) => (<SelectItem key={category.id} value={category.id.toString()}>{category.name}</SelectItem>))}</SelectContent>
                    </Select><FormMessage />
                  </FormItem>)} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="amount" render={({ field }) => (<FormItem><FormLabel>Monto</FormLabel><FormControl><CurrencyInput value={field.value} onChange={field.onChange} currency={form.watch("currency") as "UYU" | "USD"} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="currency" render={({ field }) => (
                    <FormItem><FormLabel>Moneda</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar moneda" /></SelectTrigger></FormControl>
                        <SelectContent><SelectItem value="UYU">Peso Uruguayo ($U)</SelectItem><SelectItem value="USD">Dólar Estadounidense (US$)</SelectItem></SelectContent>
                      </Select><FormMessage />
                    </FormItem>)} />
                </div>
                <FormField control={form.control} name="period" render={({ field }) => (
                  <FormItem><FormLabel>Período</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar período" /></SelectTrigger></FormControl>
                      <SelectContent><SelectItem value="monthly">Mensual</SelectItem><SelectItem value="weekly">Semanal</SelectItem><SelectItem value="biweekly">Quincenal</SelectItem><SelectItem value="yearly">Anual</SelectItem></SelectContent>
                    </Select><FormMessage />
                  </FormItem>)} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="startDate" render={({ field }) => (
                    <FormItem className="flex flex-col"><FormLabel>Fecha de inicio</FormLabel><Popover><PopoverTrigger asChild><FormControl>
                      <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                        {field.value ? format(field.value, "dd/MM/yyyy", { locale: es }) : <span>Seleccionar fecha</span>} <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={es} /></PopoverContent></Popover><FormMessage />
                    </FormItem>)} />
                  <FormField control={form.control} name="endDate" render={({ field }) => (
                    <FormItem className="flex flex-col"><FormLabel>Fecha de fin (opcional)</FormLabel><Popover><PopoverTrigger asChild><FormControl>
                      <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                        {field.value ? format(field.value, "dd/MM/yyyy", { locale: es }) : <span>Seleccionar fecha</span>} <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value ?? undefined} onSelect={field.onChange} initialFocus locale={es} disabled={(date) => date < (form.getValues("startDate") || new Date(0))} /></PopoverContent></Popover><FormMessage />
                    </FormItem>)} />
                </div>
                <FormField control={form.control} name="isRollover" render={({ field }) => (<FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel>Acumular saldo</FormLabel><FormDescription>Si no gastas todo el monto del proyecto, el saldo se acumulará para el siguiente período</FormDescription></div></FormItem>)} />
                <FormField control={form.control} name="isShared" render={({ field }) => (<FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel>Proyecto compartido</FormLabel><FormDescription>Este proyecto será visible para todos los miembros del hogar y requiere aprobación</FormDescription></div></FormItem>)} />
                <FormField control={form.control} name="paymentType" render={({ field }) => (
                  <FormItem><FormLabel>Tipo de pago</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar tipo de pago" /></SelectTrigger></FormControl>
                    <SelectContent><SelectItem value="one-time">Pago único</SelectItem><SelectItem value="monthly">Pago mensual</SelectItem><SelectItem value="installments">Pagos en cuotas</SelectItem></SelectContent></Select>
                    <FormDescription>El tipo de pago determina cómo se generará el gasto</FormDescription><FormMessage />
                  </FormItem>)} />
                {form.watch("paymentType") === "monthly" && (<FormField control={form.control} name="paymentDay" render={({ field }) => (<FormItem><FormLabel>Día de pago</FormLabel><FormControl><Input type="number" min="1" max="31" placeholder="Ej: 10" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value === "" ? null : parseInt(e.target.value))} /></FormControl><FormDescription>Día del mes en que se realizará el cargo mensual</FormDescription><FormMessage /></FormItem>)} />)}
                {form.watch("paymentType") === "installments" && (<div className="space-y-4">
                  <FormField control={form.control} name="paymentDay" render={({ field }) => (<FormItem><FormLabel>Día de pago</FormLabel><FormControl><Input type="number" min="1" max="31" placeholder="Ej: 10" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value === "" ? null : parseInt(e.target.value))} /></FormControl><FormDescription>Día del mes en que se realizará cada cuota</FormDescription><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="installments" render={({ field }) => (<FormItem><FormLabel>Número de cuotas</FormLabel><FormControl><Input type="number" min="2" max="36" placeholder="Ej: 12" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value === "" ? null : parseInt(e.target.value))} /></FormControl><FormDescription>Cantidad de cuotas en que se dividirá el pago</FormDescription><FormMessage /></FormItem>)} />
                </div>)}
                <DialogFooter><Button type="submit" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700" disabled={createBudgetMutation.isPending}>{createBudgetMutation.isPending && (<Loader2 className="mr-2 h-4 w-4 animate-spin" />)}Crear proyecto</Button></DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        
        <Dialog open={isEditBudgetOpen} onOpenChange={setIsEditBudgetOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Editar Proyecto</DialogTitle><DialogDescription>Modifica los detalles de tu proyecto</DialogDescription></DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <FormField control={editForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nombre</FormLabel><FormControl><Input placeholder="Ej: Supermercado Mensual" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={editForm.control} name="categoryId" render={({ field }) => (
                  <FormItem><FormLabel>Categoría</FormLabel>
                    <Select value={field.value?.toString()} onValueChange={(value) => field.onChange(parseInt(value))}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar categoría" /></SelectTrigger></FormControl>
                      <SelectContent>{categoriesData.filter((cat) => !cat.isIncome).map((category) => (<SelectItem key={category.id} value={category.id.toString()}>{category.name}</SelectItem>))}</SelectContent>
                    </Select><FormMessage />
                  </FormItem>)} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={editForm.control} name="amount" render={({ field }) => (<FormItem><FormLabel>Monto</FormLabel><FormControl><CurrencyInput value={field.value} onChange={field.onChange} currency={editForm.watch("currency") as "UYU" | "USD"} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={editForm.control} name="currency" render={({ field }) => (
                    <FormItem><FormLabel>Moneda</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar moneda" /></SelectTrigger></FormControl>
                        <SelectContent><SelectItem value="UYU">Peso Uruguayo ($U)</SelectItem><SelectItem value="USD">Dólar Estadounidense (US$)</SelectItem></SelectContent>
                      </Select><FormMessage />
                  </FormItem>)} />
                </div>
                <FormField control={editForm.control} name="period" render={({ field }) => (
                  <FormItem><FormLabel>Período</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar período" /></SelectTrigger></FormControl>
                      <SelectContent><SelectItem value="monthly">Mensual</SelectItem><SelectItem value="weekly">Semanal</SelectItem><SelectItem value="biweekly">Quincenal</SelectItem><SelectItem value="yearly">Anual</SelectItem></SelectContent>
                    </Select><FormMessage />
                  </FormItem>)} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={editForm.control} name="startDate" render={({ field }) => (
                    <FormItem className="flex flex-col"><FormLabel>Fecha de inicio</FormLabel><Popover><PopoverTrigger asChild><FormControl>
                      <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                        {field.value ? format(field.value, "dd/MM/yyyy", { locale: es }) : <span>Seleccionar fecha</span>} <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={es} /></PopoverContent></Popover><FormMessage />
                    </FormItem>)} />
                  <FormField control={editForm.control} name="endDate" render={({ field }) => (
                    <FormItem className="flex flex-col"><FormLabel>Fecha de fin (opcional)</FormLabel><Popover><PopoverTrigger asChild><FormControl>
                      <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                        {field.value ? format(field.value, "dd/MM/yyyy", { locale: es }) : <span>Seleccionar fecha</span>} <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value ?? undefined} onSelect={field.onChange} initialFocus locale={es} disabled={(date) => date < (editForm.getValues("startDate") || new Date(0))} /></PopoverContent></Popover><FormMessage />
                    </FormItem>)} />
                </div>
                <FormField control={editForm.control} name="isRollover" render={({ field }) => (<FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel>Acumular saldo</FormLabel><FormDescription>Si no gastas todo el monto del proyecto, el saldo se acumulará para el siguiente período</FormDescription></div></FormItem>)} />
                <FormField control={editForm.control} name="isShared" render={({ field }) => (<FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel>Proyecto compartido</FormLabel><FormDescription>Este proyecto será visible para todos los miembros del hogar y requiere aprobación</FormDescription></div></FormItem>)} />
                <FormField control={editForm.control} name="paymentType" render={({ field }) => (
                  <FormItem><FormLabel>Tipo de pago</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar tipo de pago" /></SelectTrigger></FormControl>
                    <SelectContent><SelectItem value="one-time">Pago único</SelectItem><SelectItem value="monthly">Pago mensual</SelectItem><SelectItem value="installments">Pagos en cuotas</SelectItem></SelectContent></Select>
                    <FormDescription>El tipo de pago determina cómo se generará el gasto</FormDescription><FormMessage />
                  </FormItem>)} />
                {editForm.watch("paymentType") === "monthly" && (<FormField control={editForm.control} name="paymentDay" render={({ field }) => (<FormItem><FormLabel>Día de pago</FormLabel><FormControl><Input type="number" min="1" max="31" placeholder="Ej: 10" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value === "" ? null : parseInt(e.target.value))} /></FormControl><FormDescription>Día del mes en que se realizará el cargo mensual</FormDescription><FormMessage /></FormItem>)} />)}
                {editForm.watch("paymentType") === "installments" && (<div className="space-y-4">
                  <FormField control={editForm.control} name="paymentDay" render={({ field }) => (<FormItem><FormLabel>Día de pago</FormLabel><FormControl><Input type="number" min="1" max="31" placeholder="Ej: 10" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value === "" ? null : parseInt(e.target.value))} /></FormControl><FormDescription>Día del mes en que se realizará cada cuota</FormDescription><FormMessage /></FormItem>)} />
                  <FormField control={editForm.control} name="installments" render={({ field }) => (<FormItem><FormLabel>Número de cuotas</FormLabel><FormControl><Input type="number" min="2" max="36" placeholder="Ej: 12" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value === "" ? null : parseInt(e.target.value))} /></FormControl><FormDescription>Cantidad de cuotas en que se dividirá el pago</FormDescription><FormMessage /></FormItem>)} />
                </div>)}
                <DialogFooter><Button type="submit" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700" disabled={updateBudgetMutation.isPending}>{updateBudgetMutation.isPending && (<Loader2 className="mr-2 h-4 w-4 animate-spin" />)}Guardar cambios</Button></DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Eliminar proyecto</DialogTitle><DialogDescription>¿Estás seguro de que deseas eliminar este proyecto? Esta acción no se puede deshacer.</DialogDescription></DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancelar</Button>
              <Button variant="destructive" onClick={handleDeleteBudget} disabled={deleteBudgetMutation.isPending}>
                {deleteBudgetMutation.isPending ? (<Loader2 className="mr-2 h-4 w-4 animate-spin" />) : (<Trash2 className="mr-2 h-4 w-4" />)}
                Eliminar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Shell>
  );
}
