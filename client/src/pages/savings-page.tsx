import { Shell } from "@/components/layout/shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle, Coins, Trash2, PiggyBank, Target, Calendar, User, Edit2, DollarSign, Plus, UserPlus, Tag } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useCurrency } from "@/hooks/use-currency";
import logoImage from "@/assets/logo.jpg";

// Definimos un esquema para la validación del formulario de metas de ahorro
const savingsGoalSchema = z.object({
  name: z.string().min(2, {
    message: "El nombre debe tener al menos 2 caracteres.",
  }),
  targetAmount: z.string().min(1, {
    message: "Ingresa un monto válido.",
  }),
  currency: z.string().min(1, {
    message: "Selecciona una moneda.",
  }),
  deadline: z.string().optional(),
  isShared: z.boolean().default(false),
  icon: z.string().default("PiggyBank"),
});

// Tipo para las metas de ahorro
type SavingsGoal = {
  id: number;
  name: string;
  targetAmount: string;
  currentAmount: string;
  deadline: string | null;
  currency: string;
  isShared: boolean;
  icon: string | null;
  createdAt: string;
  userId: number;
  createdBy?: string;
};

// Tipo para las contribuciones a metas de ahorro
type SavingsContribution = {
  id: number;
  amount: string;
  date: string;
  userId: number;
  savingsGoalId: number;
  notes: string | null;
  username?: string;
};

export default function SavingsPage() {
  const [isOpenNewGoalDialog, setIsOpenNewGoalDialog] = useState(false);
  const [isOpenContributionDialog, setIsOpenContributionDialog] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null);
  const { formatCurrency } = useCurrency();
  const { user } = useAuth();
  const { toast } = useToast();

  // Consulta para obtener las metas de ahorro
  const { 
    data: savingsGoals, 
    isLoading,
    isError 
  } = useQuery<SavingsGoal[]>({
    queryKey: ['/api/savings-goals'],
    select: (data) => data.sort((a, b) => {
      // Ordenar por fecha de creación, más recientes primero
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }),
  });

  // Consulta para obtener las contribuciones
  const {
    data: contributions,
    isLoading: isLoadingContributions
  } = useQuery<SavingsContribution[]>({
    queryKey: ['/api/savings-contributions'],
    enabled: !!savingsGoals && savingsGoals.length > 0,
  });

  // Mutación para crear una meta de ahorro
  const createGoalMutation = useMutation({
    mutationFn: async (values: z.infer<typeof savingsGoalSchema>) => {
      // Asegurarse de que el userId se incluya en la petición
      const savingsGoalData = {
        ...values,
        userId: user?.id,
        currentAmount: "0",
      };
      const res = await apiRequest('POST', '/api/savings-goals', savingsGoalData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Meta de ahorro creada",
        description: "La meta se ha creado correctamente",
      });
      setIsOpenNewGoalDialog(false);
      // Invalidar la consulta para actualizar la lista
      queryClient.invalidateQueries({ queryKey: ['/api/savings-goals'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al crear la meta",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutación para eliminar una meta de ahorro
  const deleteGoalMutation = useMutation({
    mutationFn: async (goalId: number) => {
      await apiRequest('DELETE', `/api/savings-goals/${goalId}`);
    },
    onSuccess: () => {
      toast({
        title: "Meta eliminada",
        description: "La meta se ha eliminado correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/savings-goals'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al eliminar la meta",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutación para añadir una contribución
  const addContributionMutation = useMutation({
    mutationFn: async (values: { amount: string; savingsGoalId: number; notes?: string }) => {
      const contributionData = {
        ...values,
        userId: user?.id,
        date: new Date().toISOString().split('T')[0],
      };
      const res = await apiRequest('POST', '/api/savings-contributions', contributionData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Contribución añadida",
        description: "Tu contribución se ha registrado correctamente",
      });
      setIsOpenContributionDialog(false);
      // Invalidar las consultas para actualizar los datos
      queryClient.invalidateQueries({ queryKey: ['/api/savings-goals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/savings-contributions'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al añadir la contribución",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Formulario para crear una nueva meta de ahorro
  const form = useForm<z.infer<typeof savingsGoalSchema>>({
    resolver: zodResolver(savingsGoalSchema),
    defaultValues: {
      name: "",
      targetAmount: "",
      currency: "UYU",
      deadline: undefined,
      isShared: false,
      icon: "PiggyBank",
    },
  });

  // Formulario para añadir una contribución
  const contributionForm = useForm({
    defaultValues: {
      amount: "",
      notes: "",
    },
  });

  // Manejador para enviar el formulario de nueva meta
  const onSubmitNewGoal = (values: z.infer<typeof savingsGoalSchema>) => {
    createGoalMutation.mutate(values);
  };

  // Manejador para enviar el formulario de contribución
  const onSubmitContribution = (values: { amount: string; notes: string }) => {
    if (selectedGoalId) {
      addContributionMutation.mutate({
        amount: values.amount,
        savingsGoalId: selectedGoalId,
        notes: values.notes || undefined,
      });
    }
  };

  // Función para manejar la apertura del diálogo de contribución
  const handleOpenContributionDialog = (goalId: number) => {
    setSelectedGoalId(goalId);
    contributionForm.reset({
      amount: "",
      notes: "",
    });
    setIsOpenContributionDialog(true);
  };

  // Función para calcular el progreso de una meta
  const calculateProgress = (goal: SavingsGoal): number => {
    const current = parseFloat(goal.currentAmount);
    const target = parseFloat(goal.targetAmount);
    if (isNaN(current) || isNaN(target) || target === 0) return 0;
    return Math.min(Math.round((current / target) * 100), 100);
  };

  // Función para obtener las contribuciones de una meta específica
  const getContributionsForGoal = (goalId: number): SavingsContribution[] => {
    if (!contributions) return [];
    return contributions.filter(c => c.savingsGoalId === goalId);
  };

  // Renderización condicional en caso de carga o error
  if (isLoading) {
    return (
      <Shell>
        <PageHeader
          title="Metas de Ahorro"
          description="Administra tus objetivos de ahorro personal y familiar"
        />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <PiggyBank className="h-12 w-12 mb-4 animate-pulse mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">Cargando metas de ahorro...</p>
          </div>
        </div>
      </Shell>
    );
  }

  if (isError) {
    return (
      <Shell>
        <PageHeader
          title="Metas de Ahorro"
          description="Administra tus objetivos de ahorro personal y familiar"
        />
        <div className="text-center p-8 border rounded-lg">
          <h3 className="text-lg font-medium mb-2 text-destructive">Error al cargar las metas</h3>
          <p className="text-muted-foreground mb-4">
            No pudimos cargar tus metas de ahorro. Por favor, intenta de nuevo más tarde.
          </p>
          <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/savings-goals'] })}>
            Reintentar
          </Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <PageHeader
        title="Metas de Ahorro"
        description="Administra tus objetivos de ahorro personal y familiar"
        actions={
          <Button onClick={() => {
            form.reset({
              name: "",
              targetAmount: "",
              currency: "UYU",
              deadline: undefined,
              isShared: false,
              icon: "PiggyBank",
            });
            setIsOpenNewGoalDialog(true);
          }} className="bg-primary hover:bg-primary/90">
            <PlusCircle className="mr-2 h-4 w-4" />
            Nueva Meta
          </Button>
        }
      />
      
      <div className="grid gap-6">
        {savingsGoals && savingsGoals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savingsGoals.map((goal) => (
              <Card key={goal.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg font-semibold truncate mr-2">{goal.name}</CardTitle>
                    <div className="flex items-center space-x-2">
                      {goal.isShared && (
                        <div className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                          Compartida
                        </div>
                      )}
                    </div>
                  </div>
                  <CardDescription className="flex items-center pt-1">
                    <User className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                    <span>Creado por: {goal.userId === user?.id ? 'Tí' : goal.createdBy || 'Usuario'}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <div className="text-sm text-muted-foreground">Progreso</div>
                      <div className="text-sm font-medium">
                        {calculateProgress(goal)}%
                      </div>
                    </div>
                    <Progress value={calculateProgress(goal)} className="h-2" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Meta</div>
                      <div className="font-semibold text-md">
                        {formatCurrency(goal.targetAmount, goal.currency)}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Acumulado</div>
                      <div className="font-semibold text-md">
                        {formatCurrency(goal.currentAmount, goal.currency)}
                      </div>
                    </div>
                  </div>
                  
                  {goal.deadline && (
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground flex items-center">
                        <Calendar className="h-3.5 w-3.5 mr-1" />
                        Fecha Límite
                      </div>
                      <div className="text-sm">
                        {format(new Date(goal.deadline), "d 'de' MMMM, yyyy", { locale: es })}
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between pt-3 border-t">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={() => deleteGoalMutation.mutate(goal.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Eliminar
                  </Button>
                  <Button 
                    size="sm"
                    className="bg-secondary hover:bg-secondary/90 text-white"
                    onClick={() => handleOpenContributionDialog(goal.id)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Contribuir
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="border rounded-lg p-12 text-center">
            <div className="mx-auto mb-6 flex justify-center">
              <img src={logoImage} alt="Logo" className="h-20 w-auto opacity-50" />
            </div>
            <h3 className="text-xl font-medium mb-2">No tienes metas de ahorro</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Crea tu primera meta de ahorro para empezar a planificar tus finanzas personales o familiares.
            </p>
            <Button 
              onClick={() => {
                form.reset();
                setIsOpenNewGoalDialog(true);
              }}
              size="lg"
              className="bg-primary hover:bg-primary/90"
            >
              <PlusCircle className="mr-2 h-5 w-5" />
              Crear Meta de Ahorro
            </Button>
          </div>
        )}
      </div>

      {/* Diálogo para crear nueva meta de ahorro */}
      <Dialog open={isOpenNewGoalDialog} onOpenChange={setIsOpenNewGoalDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nueva Meta de Ahorro</DialogTitle>
            <DialogDescription>
              Crea una meta para ahorrar dinero de forma personal o compartida con tu familia.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitNewGoal)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de la Meta</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Vacaciones, Nuevo Auto, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="targetAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monto Objetivo</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input placeholder="10000" type="number" {...field} />
                        </div>
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona moneda" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="UYU">$ (UYU)</SelectItem>
                          <SelectItem value="USD">USD ($)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="deadline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha Límite (Opcional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isShared"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Meta Compartida</FormLabel>
                      <FormDescription>
                        Permitir que otros miembros de la familia contribuyan
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setIsOpenNewGoalDialog(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  className="bg-primary hover:bg-primary/90"
                  disabled={createGoalMutation.isPending}
                >
                  {createGoalMutation.isPending ? (
                    <>
                      <div className="animate-spin mr-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <path d="M12 22C16.4183 22 20 18.4183 20 14C20 9.58172 16.4183 6 12 6"></path>
                        </svg>
                      </div>
                      Creando...
                    </>
                  ) : (
                    'Crear Meta'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Diálogo para añadir contribución */}
      <Dialog open={isOpenContributionDialog} onOpenChange={setIsOpenContributionDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Añadir Contribución</DialogTitle>
            <DialogDescription>
              Agrega dinero a tu meta de ahorro
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={contributionForm.handleSubmit(onSubmitContribution)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Monto</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                <Input 
                  id="amount" 
                  placeholder="Ingresa monto" 
                  className="pl-10" 
                  type="number"
                  step="0.01"
                  {...contributionForm.register("amount", { required: true })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas (Opcional)</Label>
              <Input 
                id="notes" 
                placeholder="Añade notas o comentarios" 
                {...contributionForm.register("notes")}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpenContributionDialog(false)}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="bg-secondary hover:bg-secondary/90 text-white"
                disabled={addContributionMutation.isPending}
              >
                {addContributionMutation.isPending ? (
                  <>
                    <div className="animate-spin mr-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M12 22C16.4183 22 20 18.4183 20 14C20 9.58172 16.4183 6 12 6"></path>
                      </svg>
                    </div>
                    Añadiendo...
                  </>
                ) : (
                  'Añadir Contribución'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}