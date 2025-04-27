import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTransactionSchema } from "@shared/schema";
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
  onComplete: () => void;
  defaultValues?: Partial<TransactionFormValues>;
  editMode?: boolean;
  transactionId?: number;
}

export function TransactionForm({ 
  onComplete, 
  defaultValues,
  editMode = false,
  transactionId 
}: TransactionFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("expense");
  const [showSplitSection, setShowSplitSection] = useState(false);
  const [isSplitting, setIsSplitting] = useState(false);
  
  // Form initialization
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues || {
      userId: user?.id,
      transactionTypeId: 2, // Default to Expense
      accountId: undefined,
      categoryId: undefined,
      amount: "",
      currency: "UYU",
      description: "",
      date: new Date(),
      time: "",
      isShared: false,
      isReconciled: false,
      isReimbursable: false,
      isReimbursed: false,
      notes: "",
      receiptUrl: "",
      splits: [],
      tags: [],
    },
  });
  
  // Get transaction types
  const { data: transactionTypes = [] } = useQuery({
    queryKey: ["/api/transaction-types"],
    queryFn: getQueryFn({ on401: "throw" }),
  });
  
  // Get accounts
  const { data: accounts = [] } = useQuery({
    queryKey: ["/api/accounts"],
    queryFn: getQueryFn({ on401: "throw" }),
  });
  
  // Get categories
  const { data: categories = [] } = useQuery({
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
      onComplete();
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
      onComplete();
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
    } else if (activeTab === "expense") {
      form.setValue("transactionTypeId", 2);
    } else if (activeTab === "transfer") {
      form.setValue("transactionTypeId", 3);
    }
  }, [activeTab, form]);
  
  // Filtered categories based on transaction type
  const filteredCategories = categories.filter((category: any) => {
    if (activeTab === "income") {
      return category.isIncome;
    } else if (activeTab === "expense") {
      return !category.isIncome;
    }
    return true;
  });
  
  // Submit handler
  const onSubmit = (data: TransactionFormValues) => {
    // Add userId if not present
    if (!data.userId && user) {
      data.userId = user.id;
    }
    
    if (editMode && transactionId) {
      updateTransactionMutation.mutate(data);
    } else {
      createTransactionMutation.mutate(data);
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="expense">Gasto</TabsTrigger>
            <TabsTrigger value="income">Ingreso</TabsTrigger>
            <TabsTrigger value="transfer">Transferencia</TabsTrigger>
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
          
          <div className="grid grid-cols-2 gap-4">
            {/* Date */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha</FormLabel>
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
                            format(field.value, "PP", { locale: es })
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
          
          {/* Description */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Supermercado" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="grid grid-cols-2 gap-4">
            {/* Category */}
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
            
            {/* Account */}
            <FormField
              control={form.control}
              name="accountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cuenta</FormLabel>
                  <Select
                    value={field.value?.toString()}
                    onValueChange={(value) => field.onChange(parseInt(value))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar cuenta" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accounts.map((account: any) => (
                        <SelectItem 
                          key={account.id} 
                          value={account.id.toString()}
                        >
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          {/* Shared Transaction */}
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
                  <FormLabel>Transacción compartida</FormLabel>
                  <FormDescription>
                    Esta transacción será visible para todos los miembros del hogar
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
          
          {/* Additional options */}
          {activeTab === "expense" && (
            <>
              {/* Split transaction */}
              <div className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <Checkbox
                  checked={showSplitSection}
                  onCheckedChange={setShowSplitSection}
                  id="split-transaction"
                />
                <div className="space-y-1 leading-none">
                  <label
                    htmlFor="split-transaction"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Dividir transacción
                  </label>
                  <p className="text-sm text-muted-foreground">
                    Dividir el importe total entre varias categorías
                  </p>
                </div>
              </div>
              
              {/* Split section */}
              {showSplitSection && (
                <div className="space-y-4 rounded-md border p-4">
                  <h3 className="text-sm font-medium">Dividir entre categorías</h3>
                  {/* Split functionality would be implemented here */}
                  <div className="text-sm text-muted-foreground">
                    Funcionalidad de división en desarrollo
                  </div>
                </div>
              )}
              
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
                    {...field}
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
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Adjuntar comprobante
            </Button>
          </div>
        </div>
        
        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={onComplete}
          >
            Cancelar
          </Button>
          <Button 
            type="submit"
            disabled={createTransactionMutation.isPending || updateTransactionMutation.isPending}
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
