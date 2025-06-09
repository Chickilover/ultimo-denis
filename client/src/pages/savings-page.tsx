import { Shell } from "@/components/layout/shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle, Coins, Trash2, PiggyBank, Target, Calendar, User, Edit2, DollarSign, Plus, UserPlus, Tag, Loader2, AlertTriangle } from "lucide-react"; // Added Loader2, AlertTriangle
import { useState, useMemo } from "react"; // Added useMemo
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, type QueryKey } from "@tanstack/react-query"; // Import QueryKey
import { apiRequest, queryClient } from "@/lib/queryClient"; // queryClient was already imported
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { 
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Switch } from "@/components/ui/switch";
import { format, isValid as isValidDate } from "date-fns"; // Added isValidDate
import { es } from "date-fns/locale";
import { useCurrency } from "@/hooks/use-currency";
import logoImage from "@/assets/logo.jpg";
import type { SavingsGoal as SavingsGoalType, SavingsContribution as SavingsContributionType, InsertSavingsGoal, InsertSavingsContribution } from "@shared/schema"; // Import schema types

// Zod schema for the savings goal form
const savingsGoalFormSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
  targetAmount: z.string().min(1, "Ingresa un monto válido."), // Kept as string for form input
  currency: z.string().min(1, "Selecciona una moneda."),
  deadline: z.string().optional().nullable(), // String from date input, can be optional or null
  isShared: z.boolean().default(false),
  icon: z.string().default("PiggyBank").nullable(),
});
type SavingsGoalFormValues = z.infer<typeof savingsGoalFormSchema>;

// Zod schema for the contribution form
const contributionFormSchema = z.object({
  amount: z.string().min(1, "El monto es requerido."), // Kept as string for form input
  notes: z.string().optional().nullable(),
});
type ContributionFormValues = z.infer<typeof contributionFormSchema>;


export default function SavingsPage() {
  const [isOpenNewGoalDialog, setIsOpenNewGoalDialog] = useState(false);
  const [isOpenContributionDialog, setIsOpenContributionDialog] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoalType | null>(null); // Typed state
  const { formatCurrency } = useCurrency();
  const { user } = useAuth(); // user is User | null
  const { toast } = useToast();

  const { 
    data: savingsGoalsData = [],
    isLoading: savingsGoalsLoading,
    isError: savingsGoalsIsError,
    error: savingsGoalsErrorObj,
  } = useQuery<SavingsGoalType[], Error, SavingsGoalType[], QueryKey>({
    queryKey: ['/api/savings-goals'],
    queryFn: getQueryFn({ on401: "throw" }),
    select: (data) => data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    initialData: [],
  });

  const {
    data: contributionsData = [],
    isLoading: contributionsLoading,
    // isError and error can be added if needed for specific error handling for contributions
  } = useQuery<SavingsContributionType[], Error, SavingsContributionType[], QueryKey>({
    queryKey: ['/api/savings-contributions', { goalId: selectedGoal?.id }], // Dynamic query key
    queryFn: () => getQueryFn({ on401: "throw" })({ queryKey: ['/api/savings-contributions', { goalId: selectedGoal?.id }] }),
    enabled: !!selectedGoal, // Only fetch if a goal is selected
    initialData: [],
  });

  const createGoalMutation = useMutation<SavingsGoalType, Error, InsertSavingsGoal>({
    mutationFn: async (values) => apiRequest('POST', '/api/savings-goals', values).then(res => res.json()),
    onSuccess: () => {
      toast({ title: "Meta de ahorro creada", description: "La meta se ha creado correctamente" });
      setIsOpenNewGoalDialog(false);
      queryClient.invalidateQueries({ queryKey: ['/api/savings-goals'] });
    },
    onError: (error: Error) => toast({ title: "Error al crear la meta", description: error.message, variant: "destructive" }),
  });

  const deleteGoalMutation = useMutation<void, Error, number>({
    mutationFn: async (goalId) => apiRequest('DELETE', `/api/savings-goals/${goalId}`),
    onSuccess: () => {
      toast({ title: "Meta eliminada", description: "La meta se ha eliminado correctamente" });
      queryClient.invalidateQueries({ queryKey: ['/api/savings-goals'] });
    },
    onError: (error: Error) => toast({ title: "Error al eliminar la meta", description: error.message, variant: "destructive" }),
  });

  const addContributionMutation = useMutation<SavingsContributionType, Error, InsertSavingsContribution>({
    mutationFn: async (values) => apiRequest('POST', '/api/savings-contributions', values).then(res => res.json()),
    onSuccess: () => {
      toast({ title: "Contribución añadida", description: "Tu contribución se ha registrado correctamente" });
      setIsOpenContributionDialog(false);
      queryClient.invalidateQueries({ queryKey: ['/api/savings-goals'] }); // Invalidate goals to update currentAmount
      queryClient.invalidateQueries({ queryKey: ['/api/savings-contributions', { goalId: selectedGoal?.id }] });
    },
    onError: (error: Error) => toast({ title: "Error al añadir la contribución", description: error.message, variant: "destructive" }),
  });

  const goalForm = useForm<SavingsGoalFormValues>({
    resolver: zodResolver(savingsGoalFormSchema),
    defaultValues: { name: "", targetAmount: "", currency: "UYU", deadline: "", isShared: false, icon: "PiggyBank" },
  });

  const contributionForm = useForm<ContributionFormValues>({
    resolver: zodResolver(contributionFormSchema), // Added resolver
    defaultValues: { amount: "", notes: "" },
  });

  const onSubmitNewGoal = (values: SavingsGoalFormValues) => {
    if (!user?.id) {
      toast({ title: "Error", description: "Usuario no autenticado.", variant: "destructive" });
      return;
    }
    const goalToCreate: InsertSavingsGoal = {
      ...values,
      userId: user.id,
      currentAmount: "0", // API expects string for numeric
      targetAmount: values.targetAmount, // Already string from form
      deadline: values.deadline ? new Date(values.deadline) : null, // Convert string to Date or null
    };
    createGoalMutation.mutate(goalToCreate);
  };

  const onSubmitContribution = (values: ContributionFormValues) => {
    if (!selectedGoal?.id || !user?.id) {
      toast({ title: "Error", description: "Meta o usuario no seleccionado.", variant: "destructive" });
      return;
    }
    const contributionToCreate: InsertSavingsContribution = {
      amount: values.amount, // Already string from form
      savingsGoalId: selectedGoal.id, // This is a number
      notes: values.notes || null,
      userId: user.id,
      date: new Date(), // API expects Date
    };
    addContributionMutation.mutate(contributionToCreate);
  };

  const handleOpenContributionDialog = (goal: SavingsGoalType) => {
    setSelectedGoal(goal);
    contributionForm.reset({ amount: "", notes: "" });
    setIsOpenContributionDialog(true);
  };

  const calculateGoalProgress = (goal: SavingsGoalType): number => {
    const current = parseFloat(goal.currentAmount);
    const target = parseFloat(goal.targetAmount);
    if (isNaN(current) || isNaN(target) || target === 0) return 0;
    return Math.min(Math.round((current / target) * 100), 100);
  };

  const getContributionsForSelectedGoal = useMemo((): SavingsContributionType[] => {
    if (!selectedGoal || !contributionsData) return [];
    return contributionsData.filter(c => c.savingsGoalId === selectedGoal.id)
      .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [contributionsData, selectedGoal]);


  if (savingsGoalsLoading) {
    return (
      <Shell>
        <PageHeader title="Metas de Ahorro" description="Administra tus objetivos de ahorro personal y familiar" />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center"><Loader2 className="h-12 w-12 mb-4 animate-spin mx-auto text-primary" /><p className="text-muted-foreground">Cargando metas...</p></div>
        </div>
      </Shell>
    );
  }

  if (savingsGoalsIsError) {
    return (
      <Shell>
        <PageHeader title="Metas de Ahorro" description="Administra tus objetivos de ahorro personal y familiar" />
        <div className="text-center p-8 border rounded-lg bg-destructive/10 text-destructive">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Error al cargar las metas</h3>
          <p className="mb-4">{savingsGoalsErrorObj?.message || "No pudimos cargar tus metas de ahorro. Por favor, intenta de nuevo más tarde."}</p>
          <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/savings-goals'] })}>Reintentar</Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <PageHeader title="Metas de Ahorro" description="Administra tus objetivos de ahorro personal y familiar"
        actions={
          <Button onClick={() => { goalForm.reset({ name: "", targetAmount: "", currency: "UYU", deadline: "", isShared: false, icon: "PiggyBank" }); setIsOpenNewGoalDialog(true); }} className="bg-primary hover:bg-primary/90">
            <PlusCircle className="mr-2 h-4 w-4" />Nueva Meta
          </Button>
        }
      />
      <div className="grid gap-6">
        {savingsGoalsData.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savingsGoalsData.map((goal: SavingsGoalType) => {
              const progress = calculateGoalProgress(goal);
              return (
              <Card key={goal.id} className="overflow-hidden flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg font-semibold truncate mr-2">{goal.name}</CardTitle>
                    {goal.isShared && (<Badge variant="outline" className="text-xs border-blue-500 text-blue-500">Compartida</Badge>)}
                  </div>
                  {goal.userId !== user?.id && goal.createdBy && ( // Assuming createdBy field exists if not user's own goal
                     <CardDescription className="flex items-center pt-1 text-xs"><User className="h-3 w-3 mr-1" /><span>Por: {goal.createdBy}</span></CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4 flex-grow">
                  <div className="space-y-2">
                    <div className="flex justify-between"><span className="text-sm text-muted-foreground">Progreso</span><span className="text-sm font-medium">{progress}%</span></div>
                    <Progress value={progress} className="h-2" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><div className="text-sm text-muted-foreground">Meta</div><div className="font-semibold text-md">{formatCurrency(parseFloat(goal.targetAmount), goal.currency)}</div></div>
                    <div className="space-y-1"><div className="text-sm text-muted-foreground">Acumulado</div><div className="font-semibold text-md">{formatCurrency(parseFloat(goal.currentAmount), goal.currency)}</div></div>
                  </div>
                  {goal.deadline && isValidDate(new Date(goal.deadline)) && (
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground flex items-center"><Calendar className="h-3.5 w-3.5 mr-1" />Fecha Límite</div>
                      <div className="text-sm">{format(new Date(goal.deadline), "d 'de' MMMM, yyyy", { locale: es })}</div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between pt-3 border-t bg-muted/30">
                  <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive" onClick={() => deleteGoalMutation.mutate(goal.id)} disabled={deleteGoalMutation.isPending}>
                    <Trash2 className="h-4 w-4 mr-1" />Eliminar
                  </Button>
                  <Button size="sm" className="bg-primary hover:bg-primary/90 text-white" onClick={() => handleOpenContributionDialog(goal)}>
                    <Plus className="h-4 w-4 mr-1" />Contribuir
                  </Button>
                </CardFooter>
              </Card>
            );})}
          </div>
        ) : (
          <div className="border rounded-lg p-12 text-center">
            <div className="mx-auto mb-6 flex justify-center"><img src={logoImage} alt="Nido Financiero" className="h-20 w-auto opacity-50" /></div>
            <h3 className="text-xl font-medium mb-2">Comienza a Ahorrar Hoy</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">Crea tu primera meta de ahorro y da el primer paso hacia tus sueños financieros. ¡Es fácil y motivador!</p>
            <Button onClick={() => { goalForm.reset(); setIsOpenNewGoalDialog(true); }} size="lg" className="bg-primary hover:bg-primary/90"><PlusCircle className="mr-2 h-5 w-5" />Crear Primera Meta</Button>
          </div>
        )}
      </div>

      <Dialog open={isOpenNewGoalDialog} onOpenChange={setIsOpenNewGoalDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>Nueva Meta de Ahorro</DialogTitle><DialogDescription>Crea una meta para ahorrar dinero de forma personal o compartida.</DialogDescription></DialogHeader>
          <Form {...goalForm}>
            <form onSubmit={goalForm.handleSubmit(onSubmitNewGoal)} className="space-y-4 py-2">
              <FormField control={goalForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nombre de la Meta</FormLabel><FormControl><Input placeholder="Ej: Vacaciones, Nuevo Auto" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={goalForm.control} name="targetAmount" render={({ field }) => (<FormItem><FormLabel>Monto Objetivo</FormLabel><FormControl><Input placeholder="10000" type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={goalForm.control} name="currency" render={({ field }) => (<FormItem><FormLabel>Moneda</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecciona moneda" /></SelectTrigger></FormControl><SelectContent><SelectItem value="UYU">$ (UYU)</SelectItem><SelectItem value="USD">USD ($)</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
              </div>
              <FormField control={goalForm.control} name="deadline" render={({ field }) => (<FormItem><FormLabel>Fecha Límite (Opcional)</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={goalForm.control} name="icon" render={({ field }) => (<FormItem><FormLabel>Icono (Opcional)</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value ?? "PiggyBank"}><FormControl><SelectTrigger><SelectValue placeholder="Selecciona un icono" /></SelectTrigger></FormControl><SelectContent><SelectItem value="PiggyBank">🐷 Alcancía</SelectItem><SelectItem value="Vacaciones">✈️ Vacaciones</SelectItem><SelectItem value="Emergencia">🛡️ Emergencia</SelectItem><SelectItem value="Casa">🏠 Casa</SelectItem><SelectItem value="Target">🎯 Otro Objetivo</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
              <FormField control={goalForm.control} name="isShared" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><FormLabel>Meta Compartida</FormLabel><FormDescription>Permitir que otros miembros del hogar contribuyan.</FormDescription></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormMessage /></FormItem>)} />
              <DialogFooter><Button type="button" variant="outline" onClick={() => setIsOpenNewGoalDialog(false)}>Cancelar</Button><Button type="submit" className="bg-primary hover:bg-primary/90" disabled={createGoalMutation.isPending}>{createGoalMutation.isPending ? (<><Loader2 className="animate-spin mr-2 h-4 w-4" />Creando...</>) : 'Crear Meta'}</Button></DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isOpenContributionDialog} onOpenChange={setIsOpenContributionDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>Añadir Contribución a "{selectedGoal?.name}"</DialogTitle><DialogDescription>Agrega fondos a tu meta de ahorro.</DialogDescription></DialogHeader>
          <Form {...contributionForm}>
            <form onSubmit={contributionForm.handleSubmit(onSubmitContribution)} className="space-y-4 py-2">
              <FormField control={contributionForm.control} name="amount" render={({ field }) => (<FormItem><FormLabel>Monto a contribuir ({selectedGoal?.currency})</FormLabel><FormControl><div className="relative"><DollarSign className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" /><Input id="amount" placeholder="Ingresa monto" className="pl-10" type="number" step="0.01" {...field} /></div></FormControl><FormMessage /></FormItem>)} />
              <FormField control={contributionForm.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notas (Opcional)</FormLabel><FormControl><Input id="notes" placeholder="Añade notas o comentarios" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
              <DialogFooter><Button type="button" variant="outline" onClick={() => setIsOpenContributionDialog(false)}>Cancelar</Button><Button type="submit" className="bg-primary hover:bg-primary/90" disabled={addContributionMutation.isPending}>{addContributionMutation.isPending ? (<><Loader2 className="animate-spin mr-2 h-4 w-4" />Añadiendo...</>) : 'Añadir Contribución'}</Button></DialogFooter>
            </form>
          </Form>
          {selectedGoal && contributionsLoading && (<div className="text-center mt-4"><Loader2 className="h-6 w-6 animate-spin text-primary mx-auto"/> <p>Cargando contribuciones...</p></div>)}
          {selectedGoal && !contributionsLoading && getContributionsForSelectedGoal.length > 0 && (
            <div className="mt-6 pt-4 border-t">
              <h4 className="text-md font-semibold mb-2">Contribuciones Recientes</h4>
              <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
                {getContributionsForSelectedGoal.map(c => (
                  <div key={c.id} className="flex justify-between items-center text-sm p-2 bg-muted/50 rounded-md">
                    <div>
                      <p>{format(new Date(c.date), "dd/MM/yy", { locale: es })} - {formatCurrency(parseFloat(c.amount), selectedGoal.currency)}</p>
                      {c.notes && <p className="text-xs text-muted-foreground italic">{c.notes}</p>}
                    </div>
                    {/* Optionally show who made the contribution if data is available */}
                    {/* <User className="h-4 w-4 text-muted-foreground" /> */}
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Shell>
  );
}