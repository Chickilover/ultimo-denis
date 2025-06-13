import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { formTransactionSchema } from "@/schemas/transaction-schema"; // <-- AÑADIR ESTA LÍNEA
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { CurrencyInput } from "@/components/ui/currency-input";

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// Extend the transaction schema for form validation
const formSchema = insertTransactionSchema.extend({
  date: z.date({
    required_error: "La fecha es requerida",
  }),
  description: z.string().min(1, "La descripción es requerida"),
  categoryId: z.number({
    required_error: "La categoría es requerida",
  }).min(1, "Debes seleccionar una categoría"),
  amount: z.string().min(1, "El importe es requerido"),
  splits: z.array(
    z.object({
      categoryId: z.number(),
      amount: z.string(),
      description: z.string().optional(),
    })
  ).optional(),
  tags: z.array(z.number()).optional(),
});

type TransactionFormValues = z.infer<typeof formSchema>;

interface TransactionFormProps {
  onSuccess: () => void;
  defaultValues?: Partial<TransactionFormValues>;
  editMode?: boolean;
  transactionId?: number;
}

export function TransactionForm({
  onSuccess,
  defaultValues,
  editMode = false,
  transactionId
}: TransactionFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(defaultValues?.transactionTypeId === 1 ? "income" : "expense");
  const [showSplitSection, setShowSplitSection] = useState(false);
  const [isSplitting, setIsSplitting] = useState(false);
  const [descriptionSuggestions, setDescriptionSuggestions] = useState<string[]>([]);
  
  // Form initialization with stabilized date handling
  const defaultFormValues = React.useMemo(() => {
    // Handle the case where date comes as a string from API
    let defaultDate: Date;
    
    if (defaultValues?.date) {
      // If it's already a Date object, use it
      if (defaultValues.date instanceof Date) {
        defaultDate = defaultValues.date;
      } 
      // If it's a string, convert it to Date
      else if (typeof defaultValues.date === 'string') {
        defaultDate = new Date(defaultValues.date);
      }
      // Fallback to current date
      else {
        defaultDate = new Date();
      }
    } else {
      defaultDate = new Date();
    }
    
    const emptyDefaults = {
      userId: user?.id,
      transactionTypeId: activeTab === "income" ? 1 : 2,
      categoryId: undefined,
      amount: "",
      currency: "UYU", // Default to Uruguayan pesos
      description: "",
      time: "",
      isShared: false,
      isReconciled: false,
      isReimbursable: false,
      isReimbursed: false,
      notes: "",
      receiptUrl: "",
      splits: [],
      tags: [],
    };
    
    // Asegurarse que description tenga un valor por defecto para evitar errores de inputs no controlados
    return {
      ...emptyDefaults,
      ...(defaultValues || {}),
      date: defaultDate,
      description: (defaultValues?.description || "") + "", // Forzar string para evitar undefined
      notes: (defaultValues?.notes || "") + "", // Forzar string para evitar undefined
    };
  }, [defaultValues, user?.id, activeTab]);
  
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultFormValues,
  });
  
  // Get transaction types
  const { data: transactionTypes = [] } = useQuery({
    queryKey: ["/api/transaction-types"],
    queryFn: getQueryFn({ on401: "throw" }),
  });
  
  // Get categories
  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ["/api/categories"],
    queryFn: getQueryFn({ on401: "throw" }),
  });
  
  // Get tags
  const { data: tags = [] } = useQuery({
    queryKey: ["/api/tags"],
    queryFn: getQueryFn({ on401: "throw" }),
  });
  
  // Create transaction mutation
  const createTransactionMutation = useMutation({
    mutationFn: async (data: TransactionFormValues) => {
      const res = await apiRequest("POST", "/api/transactions", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      toast({
        title: "Transacción creada",
        description: "La transacción se ha registrado correctamente",
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Error al crear la transacción: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Update transaction mutation
  const updateTransactionMutation = useMutation({
    mutationFn: async (data: TransactionFormValues) => {
      const res = await apiRequest("PUT", `/api/transactions/${transactionId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      toast({
        title: "Transacción actualizada",
        description: "La transacción se ha actualizado correctamente",
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Error al actualizar la transacción: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Watch for form value changes
  const watchedTransactionTypeId = form.watch("transactionTypeId");
  
  // Update tab when transaction type changes
  useEffect(() => {
    if (watchedTransactionTypeId === 1) {
      setActiveTab("income");
    } else if (watchedTransactionTypeId === 2) {
      setActiveTab("expense");
    } else if (watchedTransactionTypeId === 3) {
      setActiveTab("transfer");
    }
  }, [watchedTransactionTypeId]);
  
  // Update transaction type when tab changes
  useEffect(() => {
    if (activeTab === "income") {
      form.setValue("transactionTypeId", 1);
      // Para ingresos, no cambiamos automáticamente la opción de compartido
      // El usuario decidirá después cómo distribuirlo manualmente
    } else if (activeTab === "expense") {
      form.setValue("transactionTypeId", 2);
    } else if (activeTab === "transfer") {
      form.setValue("transactionTypeId", 3);
    }
  }, [activeTab, form]);
  
  // Filtered categories based on transaction type
  const filteredCategories = categories ? (categories as any[]).filter((category) => {
    if (activeTab === "income") {
      return category.isIncome;
    } else if (activeTab === "expense") {
      return !category.isIncome;
    }
    return true;
  }) : [];
  
  // Load suggestions based on selected category
  const loadSuggestionsForCategory = (categoryId: number) => {
    // Get existing transactions from cache
    const cachedTransactions = queryClient.getQueryData<any[]>(["/api/transactions"]);
    
    if (cachedTransactions && cachedTransactions.length > 0) {
      // Filter transactions by categoryId and get unique descriptions
      const suggestedDescriptions = Array.from(
        new Set(
          cachedTransactions
            .filter(transaction => transaction.categoryId === categoryId)
            .map(transaction => transaction.description)
        )
      );
      
      setDescriptionSuggestions(suggestedDescriptions);
    } else {
      setDescriptionSuggestions([]);
    }
  };
  
  // Submit handler con mejor manejo de fechas
  const onSubmit = (data: TransactionFormValues) => {
    // Add userId if not present
    if (!data.userId && user) {
      data.userId = user.id;
    }
    
    // Asegurarnos de que la fecha sea un objeto Date
    let formattedDate: Date;
    if (data.date) {
      // Si ya es un objeto Date, usarlo directamente
      if (data.date instanceof Date) {
        formattedDate = data.date;
      } else {
        // Si es una cadena, convertirla a Date
        formattedDate = new Date(data.date);
      }
    } else {
      formattedDate = new Date();
    }
    
    // Verificar que el userId esté presente
    if (!user || !user.id) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión para realizar esta acción",
        variant: "destructive",
      });
      return;
    }
    
    // Crear un nuevo objeto con los campos obligatorios
    const completeData = {
      userId: user.id,
      categoryId: data.categoryId || 1,
      transactionTypeId: activeTab === "expense" ? 2 : 1,
      amount: data.amount || "0",
      currency: data.currency || 'UYU',
      description: data.description || "",
      date: formattedDate,
      time: data.time || null,
      accountId: data.accountId || null,
      notes: data.notes || '',
      receiptUrl: data.receiptUrl || null,
      isShared: data.isShared || false,
      isReconciled: data.isReconciled || false,
      isReimbursable: activeTab === "expense" ? (data.isReimbursable || false) : false,
      isReimbursed: false
    };
    
    // Prevenir interacciones múltiples durante la operación
    if (createTransactionMutation.isPending || updateTransactionMutation.isPending) {
      return;
    }
    
    try {
      if (editMode && transactionId) {
        updateTransactionMutation.mutate(completeData);
      } else {
        createTransactionMutation.mutate(completeData);
      }
      toast({
        title: "Enviando datos...",
        description: "Enviando la transacción al servidor",
      });
    } catch (error) {
      console.error('Error al enviar transacción:', error);
      toast({
        title: "Error al enviar",
        description: `Ocurrió un error: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger 
              value="expense" 
              className="!bg-red-100 data-[state=active]:!bg-red-500 data-[state=active]:!text-white hover:!bg-red-200 border border-red-300"
            >
              Gasto
            </TabsTrigger>
            <TabsTrigger 
              value="income"
              className="!bg-green-100 data-[state=active]:!bg-green-500 data-[state=active]:!text-white hover:!bg-green-200 border border-green-300"
            >
              Ingreso
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="space-y-4">
          {/* Amount */}
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Importe</FormLabel>
                <FormControl>
                  <CurrencyInput
                    value={field.value}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="grid grid-cols-1 gap-4">
            {/* Currency */}
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
          
          {/* Category - AHORA PRIMERO */}
          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoría</FormLabel>
                <Select
                  value={field.value?.toString()}
                  onValueChange={(value) => {
                    field.onChange(parseInt(value));
                    // Al cambiar categoría, podríamos cargar sugerencias para autocompletado
                    loadSuggestionsForCategory(parseInt(value));
                  }}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {filteredCategories.map((category: any) => (
                      <SelectItem 
                        key={category.id} 
                        value={category.id.toString()}
                      >
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Description - AHORA DESPUÉS */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Ej: Supermercado" 
                    {...field} 
                    list="suggestions"
                  />
                </FormControl>
                {descriptionSuggestions.length > 0 && (
                  <datalist id="suggestions">
                    {descriptionSuggestions.map((suggestion, index) => (
                      <option key={index} value={suggestion} />
                    ))}
                  </datalist>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Transaction Type: Personal vs. Hogar */}
          {activeTab === "income" && (
            <FormField
              control={form.control}
              name="isShared"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Distribución de Fondos</FormLabel>
                  <Select
                    value={field.value ? "hogar" : "personal"}
                    onValueChange={(value) => field.onChange(value === "hogar")}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar destino" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="personal">Añadir a Fondos Personales</SelectItem>
                      <SelectItem value="hogar">Añadir a Fondos del Hogar</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Especifica a qué cuenta de fondos se agregará este ingreso
                  </FormDescription>
                </FormItem>
              )}
            />
          )}
          
          {activeTab === "expense" && (
            <FormField
              control={form.control}
              name="isShared"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Gasto</FormLabel>
                  <Select
                    value={field.value ? "hogar" : "personal"}
                    onValueChange={(value) => field.onChange(value === "hogar")}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="personal">Gasto Personal</SelectItem>
                      <SelectItem value="hogar">Gasto del Hogar</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Personal: solo visible para ti y afecta tu balance personal.
                    Hogar: visible para todos los miembros y afecta el balance compartido.
                  </FormDescription>
                </FormItem>
              )}
            />
          )}
          
          {/* Additional options */}
          {activeTab === "expense" && (
            <>
              
              {/* Reimbursable */}
              <FormField
                control={form.control}
                name="isReimbursable"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Reembolsable</FormLabel>
                      <FormDescription>
                        Este gasto debe ser reembolsado por otra persona
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </>
          )}
          
          {/* Notes */}
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notas adicionales</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Notas adicionales sobre esta transacción"
                    className="resize-none"
                    value={field.value || ""}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    ref={field.ref}
                    name={field.name}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Receipt Upload Section - This would be implemented with actual file upload functionality */}
          <div className="border-t pt-4">
            <Button
              type="button"
              variant="outline"
              className="text-sm"
              disabled
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Adjuntar comprobante
            </Button>
          </div>
        </div>
        
        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={onSuccess}
          >
            Cancelar
          </Button>
          <Button 
            type="submit"
            disabled={createTransactionMutation.isPending || updateTransactionMutation.isPending}
            className={activeTab === "income" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
          >
            {(createTransactionMutation.isPending || updateTransactionMutation.isPending) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {editMode ? "Actualizar" : "Guardar"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
