import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  InfoIcon,
} from "lucide-react";

// Budget form schema
const budgetFormSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  categoryId: z.number({
    required_error: "Selecciona una categoría"
  }),
  amount: z.string().min(1, "El monto es requerido"),
  currency: z.string().min(1, "Selecciona una moneda"),
  period: z.string().min(1, "Selecciona un período"),
  isRollover: z.boolean().default(false),
  isShared: z.boolean().default(false),
  startDate: z.date({
    required_error: "La fecha de inicio es requerida",
  }),
  endDate: z.date().optional(),
});

type BudgetFormValues = z.infer<typeof budgetFormSchema>;

export default function BudgetsPage() {
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("active");
  const [isNewBudgetOpen, setIsNewBudgetOpen] = useState(false);
  const [isEditBudgetOpen, setIsEditBudgetOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<any>(null);
  
  // Fetch budgets
  const { data: budgets = [], isLoading } = useQuery({
    queryKey: ["/api/budgets"],
    queryFn: getQueryFn({ on401: "throw" }),
  });
  
  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: getQueryFn({ on401: "throw" }),
  });
  
  // Fetch transactions to calculate progress
  const { data: transactions = [] } = useQuery({
    queryKey: ["/api/transactions"],
    queryFn: getQueryFn({ on401: "throw" }),
  });
  
  // New budget form
  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: {
      name: "",
      categoryId: undefined,
      amount: "",
      currency: "UYU",
      period: "monthly",
      isRollover: false,
      isShared: false,
      startDate: new Date(),
    },
  });
  
  // Edit budget form
  const editForm = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: {
      name: "",
      categoryId: undefined,
      amount: "",
      currency: "UYU",
      period: "monthly",
      isRollover: false,
      isShared: false,
      startDate: new Date(),
    },
  });
  
  // Create budget mutation
  const createBudgetMutation = useMutation({
    mutationFn: async (data: BudgetFormValues) => {
      const res = await apiRequest("POST", "/api/budgets", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budgets"] });
      toast({
        title: "Presupuesto creado",
        description: "El presupuesto se ha creado correctamente",
      });
      setIsNewBudgetOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Error al crear el presupuesto: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Update budget mutation
  const updateBudgetMutation = useMutation({
    mutationFn: async (data: BudgetFormValues & { id: number }) => {
      const { id, ...budgetData } = data;
      const res = await apiRequest("PUT", `/api/budgets/${id}`, budgetData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budgets"] });
      toast({
        title: "Presupuesto actualizado",
        description: "El presupuesto se ha actualizado correctamente",
      });
      setIsEditBudgetOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Error al actualizar el presupuesto: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Delete budget mutation
  const deleteBudgetMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/budgets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budgets"] });
      toast({
        title: "Presupuesto eliminado",
        description: "El presupuesto se ha eliminado correctamente",
      });
      setIsDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Error al eliminar el presupuesto: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Submit handlers
  const onSubmit = (data: BudgetFormValues) => {
    createBudgetMutation.mutate(data);
  };
  
  const onEditSubmit = (data: BudgetFormValues) => {
    if (!selectedBudget) return;
    updateBudgetMutation.mutate({ ...data, id: selectedBudget.id });
  };
  
  const handleDeleteBudget = () => {
    if (!selectedBudget) return;
    deleteBudgetMutation.mutate(selectedBudget.id);
  };
  
  // Edit budget handler
  const handleEditBudget = (budget: any) => {
    setSelectedBudget(budget);
    editForm.reset({
      name: budget.name,
      categoryId: budget.categoryId,
      amount: budget.amount.toString(),
      currency: budget.currency,
      period: budget.period,
      isRollover: budget.isRollover,
      isShared: budget.isShared,
      startDate: new Date(budget.startDate),
      endDate: budget.endDate ? new Date(budget.endDate) : undefined,
    });
    setIsEditBudgetOpen(true);
  };
  
  // Calculate budget progress
  const calculateBudgetProgress = (budget: any) => {
    // Get relevant transactions for this budget
    const relevant = transactions.filter((tx: any) => {
      // Only expenses
      if (tx.transactionTypeId !== 2) return false;
      
      // Match category
      if (tx.categoryId !== budget.categoryId) return false;
      
      // Check date range
      const txDate = new Date(tx.date);
      const startDate = new Date(budget.startDate);
      const endDate = budget.endDate ? new Date(budget.endDate) : null;
      
      // For monthly budgets, only count this month's transactions
      if (budget.period === "monthly") {
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        return txDate >= firstDayOfMonth && txDate <= lastDayOfMonth;
      }
      
      // For other periods, check against budget start/end dates
      if (endDate) {
        return txDate >= startDate && txDate <= endDate;
      }
      
      return txDate >= startDate;
    });
    
    // Sum up the expenses
    const spent = relevant.reduce((sum: number, tx: any) => {
      // Convert to budget currency if needed
      if (tx.currency !== budget.currency) {
        // Simple conversion - in real app would use exchange rate
        if (budget.currency === "UYU" && tx.currency === "USD") {
          return sum + parseFloat(tx.amount) * 40;
        } else if (budget.currency === "USD" && tx.currency === "UYU") {
          return sum + parseFloat(tx.amount) / 40;
        }
      }
      return sum + parseFloat(tx.amount);
    }, 0);
    
    return {
      spent,
      progress: calculateProgress(spent, parseFloat(budget.amount)),
      remaining: Math.max(0, parseFloat(budget.amount) - spent),
    };
  };
  
  // Get category name
  const getCategoryName = (categoryId: number) => {
    const category = categories.find((cat: any) => cat.id === categoryId);
    return category ? category.name : "Desconocida";
  };
  
  // Get period name
  const getPeriodName = (period: string) => {
    const periods: Record<string, string> = {
      "monthly": "Mensual",
      "weekly": "Semanal",
      "biweekly": "Quincenal",
      "yearly": "Anual",
    };
    return periods[period] || period;
  };
  
  // Filter budgets for tabs
  const filteredBudgets = budgets.filter((budget: any) => {
    if (activeTab === "active") {
      // If no end date, it's active, otherwise check if end date is in the future
      return !budget.endDate || new Date(budget.endDate) >= new Date();
    } else if (activeTab === "completed") {
      // Budget is completed if it has an end date in the past
      return budget.endDate && new Date(budget.endDate) < new Date();
    }
    return true;
  });
  
  return (
    <Shell>
      <div className="container px-4 py-6 max-w-7xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Presupuestos</h1>
          <Button onClick={() => setIsNewBudgetOpen(true)}>
            + Nuevo Presupuesto
          </Button>
        </div>
        
        {/* Budget Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="active">Activos</TabsTrigger>
            <TabsTrigger value="completed">Completados</TabsTrigger>
          </TabsList>
        </Tabs>
        
        {/* Budgets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            <div className="col-span-full flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredBudgets.length === 0 ? (
            <div className="col-span-full text-center p-8">
              <p className="text-muted-foreground mb-4">No hay presupuestos para mostrar</p>
              <Button onClick={() => setIsNewBudgetOpen(true)}>
                Crear nuevo presupuesto
              </Button>
            </div>
          ) : (
            filteredBudgets.map((budget: any) => {
              const { spent, progress, remaining } = calculateBudgetProgress(budget);
              const isExceeded = progress > 100;
              const statusColor = isExceeded 
                ? "bg-red-500" 
                : progress > 75 
                  ? "bg-amber-500" 
                  : "bg-green-500";
              
              return (
                <Card key={budget.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-base">{budget.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {getCategoryName(budget.categoryId)} · {getPeriodName(budget.period)}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleEditBudget(budget)}>
                            <PenLine className="mr-2 h-4 w-4" />
                            <span>Editar</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => {
                              setSelectedBudget(budget);
                              setIsDeleteDialogOpen(true);
                            }}
                            className="text-red-600 dark:text-red-400"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Eliminar</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm text-muted-foreground">Presupuesto</p>
                          <p className="text-lg font-bold">{formatCurrency(budget.amount, budget.currency)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Gastado</p>
                          <p className="text-lg font-bold">{formatCurrency(spent, budget.currency)}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Progreso</span>
                          <span className={isExceeded ? "text-red-500" : ""}>
                            {progress.toFixed(0)}%
                          </span>
                        </div>
                        <Progress value={Math.min(100, progress)} className={statusColor} />
                      </div>
                      
                      <div className="flex justify-between items-center text-sm">
                        <span>{isExceeded ? "Excedido" : "Restante"}</span>
                        <span className={isExceeded ? "text-red-500 font-semibold" : "font-medium"}>
                          {isExceeded 
                            ? `+${formatCurrency(spent - parseFloat(budget.amount), budget.currency)}` 
                            : formatCurrency(remaining, budget.currency)}
                        </span>
                      </div>
                      
                      {budget.isShared && (
                        <div className="text-xs bg-primary/10 text-primary py-1 px-2 rounded-full inline-block">
                          Compartido
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
        
        {/* New Budget Dialog */}
        <Dialog open={isNewBudgetOpen} onOpenChange={setIsNewBudgetOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nuevo Presupuesto</DialogTitle>
              <DialogDescription>
                Crea un nuevo presupuesto para controlar tus gastos
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Supermercado Mensual" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoría</FormLabel>
                      <Select
                        value={field.value?.toString()}
                        onValueChange={(value) => field.onChange(parseInt(value))}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar categoría" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories
                            .filter((cat: any) => !cat.isIncome)
                            .map((category: any) => (
                              <SelectItem key={category.id} value={category.id.toString()}>
                                {category.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monto</FormLabel>
                        <FormControl>
                          <CurrencyInput
                            value={field.value}
                            onChange={field.onChange}
                            currency={form.watch("currency") as "UYU" | "USD"}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Moneda</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar moneda" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="UYU">Peso Uruguayo ($U)</SelectItem>
                            <SelectItem value="USD">Dólar Estadounidense (US$)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="period"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Período</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar período" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="monthly">Mensual</SelectItem>
                          <SelectItem value="weekly">Semanal</SelectItem>
                          <SelectItem value="biweekly">Quincenal</SelectItem>
                          <SelectItem value="yearly">Anual</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Fecha de inicio</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "dd/MM/yyyy", { locale: es })
                                ) : (
                                  <span>Seleccionar fecha</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                              locale={es}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Fecha de fin (opcional)</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "dd/MM/yyyy", { locale: es })
                                ) : (
                                  <span>Seleccionar fecha</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                              locale={es}
                              disabled={(date) => date < form.watch("startDate")}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="isRollover"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Acumular saldo</FormLabel>
                        <FormDescription>
                          Si no gastas todo el presupuesto, el saldo se acumulará para el siguiente período
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="isShared"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Presupuesto compartido</FormLabel>
                        <FormDescription>
                          Este presupuesto será visible para todos los miembros del hogar
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button 
                    type="submit" 
                    disabled={createBudgetMutation.isPending}
                  >
                    {createBudgetMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Crear presupuesto
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        
        {/* Edit Budget Dialog */}
        <Dialog open={isEditBudgetOpen} onOpenChange={setIsEditBudgetOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Presupuesto</DialogTitle>
              <DialogDescription>
                Modifica tu presupuesto
              </DialogDescription>
            </DialogHeader>
            
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Supermercado Mensual" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoría</FormLabel>
                      <Select
                        value={field.value?.toString()}
                        onValueChange={(value) => field.onChange(parseInt(value))}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar categoría" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories
                            .filter((cat: any) => !cat.isIncome)
                            .map((category: any) => (
                              <SelectItem key={category.id} value={category.id.toString()}>
                                {category.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monto</FormLabel>
                        <FormControl>
                          <CurrencyInput
                            value={field.value}
                            onChange={field.onChange}
                            currency={editForm.watch("currency") as "UYU" | "USD"}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editForm.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Moneda</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar moneda" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="UYU">Peso Uruguayo ($U)</SelectItem>
                            <SelectItem value="USD">Dólar Estadounidense (US$)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={editForm.control}
                  name="period"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Período</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar período" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="monthly">Mensual</SelectItem>
                          <SelectItem value="weekly">Semanal</SelectItem>
                          <SelectItem value="biweekly">Quincenal</SelectItem>
                          <SelectItem value="yearly">Anual</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Fecha de inicio</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "dd/MM/yyyy", { locale: es })
                                ) : (
                                  <span>Seleccionar fecha</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                              locale={es}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editForm.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Fecha de fin (opcional)</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "dd/MM/yyyy", { locale: es })
                                ) : (
                                  <span>Seleccionar fecha</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                              locale={es}
                              disabled={(date) => date < editForm.watch("startDate")}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={editForm.control}
                  name="isRollover"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Acumular saldo</FormLabel>
                        <FormDescription>
                          Si no gastas todo el presupuesto, el saldo se acumulará para el siguiente período
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="isShared"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Presupuesto compartido</FormLabel>
                        <FormDescription>
                          Este presupuesto será visible para todos los miembros del hogar
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button 
                    type="submit" 
                    disabled={updateBudgetMutation.isPending}
                  >
                    {updateBudgetMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Guardar cambios
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        
        {/* Delete Budget Confirmation */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Eliminar presupuesto</DialogTitle>
              <DialogDescription>
                ¿Estás seguro de que deseas eliminar este presupuesto? Esta acción no se puede deshacer.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteBudget}
                disabled={deleteBudgetMutation.isPending}
              >
                {deleteBudgetMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Eliminar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Shell>
  );
}
