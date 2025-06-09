import React, { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { formTransactionSchema as baseFormTransactionSchema } from "@/schemas/transaction-schema";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { CurrencyInput } from "@/components/ui/currency-input";
import type { Transaction, Category, Tag, Account, User, InsertTransaction } from "@shared/schema"; // Import types

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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
// Calendar and Popover are not directly used in the provided snippet for this form, but keeping if they are used elsewhere in full file
// import { Calendar } from "@/components/ui/calendar";
// import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
// import { CalendarIcon } from "lucide-react"; // Not used if Calendar is removed
import { Loader2 } from "lucide-react";
// import { format } from "date-fns"; // Not used if Calendar is removed
// import { es } from "date-fns/locale"; // Not used if Calendar is removed


// Use the imported schema and extend it for form-specific needs if necessary
// For now, let's assume formTransactionSchema from "@/schemas/transaction-schema" is sufficient
// and we'll call our Zod type for the form TransactionFormValues.
// If formTransactionSchema doesn't include date as z.date, splits, or tags, they'd need to be added here.
// The original code had 'formSchema = insertTransactionSchema.extend', which was the error.
// We use the imported 'baseFormTransactionSchema' (aliased from formTransactionSchema).

// This is the type for the form values, derived from the Zod schema.
type TransactionFormValues = z.infer<typeof baseFormTransactionSchema>;

interface TransactionFormProps {
  onSuccess?: () => void; // Changed from onComplete and made optional
  defaultValues?: Partial<TransactionFormValues>; // Use inferred type
  editMode?: boolean;
  transactionId?: number;
  // Added to allow pre-selection of tab from parent
  initialTransactionType?: 'income' | 'expense' | 'transfer';
}

export function TransactionForm({ 
  onSuccess,
  defaultValues,
  editMode = false,
  transactionId,
  initialTransactionType = 'expense' // Default to expense if not provided
}: TransactionFormProps) {
  const { user } = useAuth(); // User can be User | null
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Determine initial tab based on prop or defaultValues
  let determinedInitialTab = initialTransactionType;
  if (defaultValues?.transactionTypeId === 1) {
    determinedInitialTab = "income";
  } else if (defaultValues?.transactionTypeId === 2) {
    determinedInitialTab = "expense";
  } else if (defaultValues?.transactionTypeId === 3) {
    determinedInitialTab = "transfer";
  }

  const [activeTab, setActiveTab] = useState<'income' | 'expense' | 'transfer'>(determinedInitialTab);
  // showSplitSection and isSplitting are not used in the provided snippet, but kept if part of full file
  // const [showSplitSection, setShowSplitSection] = useState(false);
  // const [isSplitting, setIsSplitting] = useState(false);
  const [descriptionSuggestions, setDescriptionSuggestions] = useState<string[]>([]);
  
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(baseFormTransactionSchema), // Use the imported and potentially extended schema
    defaultValues: useMemo(() => {
      const baseDefaults: Partial<TransactionFormValues> = {
        userId: user?.id,
        transactionTypeId: activeTab === "income" ? 1 : activeTab === "expense" ? 2 : 3,
        // categoryId: undefined, // Let Zod handle default or undefined
        amount: "" as unknown as number, // Schema expects number, input gives string initially
        currency: "UYU",
        description: "",
        // date needs to be Date object for react-day-picker if used, or string for API
        date: new Date(), // Default to today for new transactions
        time: null, // Default to null
        accountId: null,
        notes: "",
        receiptUrl: null,
        isShared: false,
        isReconciled: false,
        isReimbursable: false,
        isReimbursed: false,
        // splits: [], // If splits are part of the schema
        // tags: [],   // If tags are part of the schema
      };

      let processedDefaultValues = { ...baseDefaults, ...defaultValues };

      if (defaultValues?.date) {
        processedDefaultValues.date = new Date(defaultValues.date);
      }
      if (typeof defaultValues?.amount === 'number' || typeof defaultValues?.amount === 'string') {
         // CurrencyInput handles string, but schema might expect number.
         // formTransactionSchema expects amount to be a number after coercion.
         // For display in CurrencyInput, it's fine as string.
         processedDefaultValues.amount = Number(defaultValues.amount) as number;
      }


      return processedDefaultValues;
    }, [defaultValues, user?.id, activeTab])
  });
  
  const { data: categoriesData = [], isLoading: categoriesLoading } = useQuery<Category[], Error, Category[], QueryKey>({
    queryKey: ["/api/categories"],
    queryFn: getQueryFn({ on401: "throw" }),
    initialData: []
  });
  
  const { data: tagsData = [] } = useQuery<Tag[], Error, Tag[], QueryKey>({ // Assuming Tag type for tags
    queryKey: ["/api/tags"],
    queryFn: getQueryFn({ on401: "throw" }),
    initialData: []
  });

  const { data: accountsData = [] } = useQuery<Account[], Error, Account[], QueryKey>({
    queryKey: ["/api/accounts"],
    queryFn: getQueryFn({ on401: "throw" }),
    initialData: []
  });
  
  const createTransactionMutation = useMutation<Transaction, Error, InsertTransaction>({ // Input is InsertTransaction
    mutationFn: async (data) => apiRequest("POST", "/api/transactions", data).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      toast({ title: "Transacción creada", description: "La transacción se ha registrado correctamente" });
      if (onSuccess) onSuccess();
    },
    onError: (error) => toast({ title: "Error", description: `Error al crear la transacción: ${error.message}`, variant: "destructive" }),
  });
  
  const updateTransactionMutation = useMutation<Transaction, Error, Partial<InsertTransaction> & { id: number }>({
    mutationFn: async (data) => apiRequest("PUT", `/api/transactions/${data.id}`, data).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      toast({ title: "Transacción actualizada", description: "La transacción se ha actualizado correctamente" });
      if (onSuccess) onSuccess();
    },
    onError: (error) => toast({ title: "Error", description: `Error al actualizar la transacción: ${error.message}`, variant: "destructive" }),
  });
  
  const watchedTransactionTypeId = form.watch("transactionTypeId");
  
  useEffect(() => {
    if (watchedTransactionTypeId === 1) setActiveTab("income");
    else if (watchedTransactionTypeId === 2) setActiveTab("expense");
    else if (watchedTransactionTypeId === 3) setActiveTab("transfer");
  }, [watchedTransactionTypeId]);
  
  useEffect(() => {
    form.setValue("transactionTypeId", activeTab === "income" ? 1 : activeTab === "expense" ? 2 : 3);
  }, [activeTab, form]);
  
  const filteredCategories = useMemo(() => {
    return categoriesData.filter((category: Category) => {
      if (activeTab === "income") return category.isIncome;
      if (activeTab === "expense") return !category.isIncome;
      // For transfers, typically don't assign a category or show all if needed
      if (activeTab === "transfer") return true;
      return true;
    });
  }, [categoriesData, activeTab]);
  
  // This function was not fully implemented or used in the original snippet for suggestions
  const loadSuggestionsForCategory = (categoryId: number) => {
    const cachedTransactions = queryClient.getQueryData<Transaction[]>(["/api/transactions"]);
    if (cachedTransactions?.length) {
      const suggested = Array.from(new Set(cachedTransactions.filter(t => t.categoryId === categoryId).map(t => t.description)));
      setDescriptionSuggestions(suggested);
    } else {
      setDescriptionSuggestions([]);
    }
  };
  
  const onSubmit = (data: TransactionFormValues) => {
    if (!user?.id) {
      toast({ title: "Error", description: "Usuario no autenticado.", variant: "destructive" });
      return;
    }

    // Prepare data for API, ensuring fields match InsertTransaction
    const apiData: InsertTransaction = {
      userId: user.id,
      transactionTypeId: data.transactionTypeId,
      categoryId: data.categoryId,
      amount: data.amount.toString(), // API expects string for numeric
      currency: data.currency,
      description: data.description,
      date: data.date, // Zod schema coerces to Date, API might expect string. Drizzle handles Date.
      time: data.time || null,
      accountId: data.accountId || null,
      notes: data.notes || "",
      receiptUrl: data.receiptUrl || null,
      isShared: data.isShared || false,
      isReconciled: data.isReconciled || false,
      isReimbursable: activeTab === "expense" ? (data.isReimbursable || false) : false,
      isReimbursed: data.isReimbursed || false, // Schema expects boolean
      // splits and tags would be handled here if part of the form/API
    };
    
    if (editMode && transactionId) {
      updateTransactionMutation.mutate({ ...apiData, id: transactionId });
    } else {
      createTransactionMutation.mutate(apiData);
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Tabs for Income/Expense/Transfer - Assuming this part of UI is simplified or handled by parent */}
        {/* For simplicity, assuming transactionTypeId is set correctly based on activeTab or defaultValues */}

        <FormField control={form.control} name="amount" render={({ field }) => (
          <FormItem>
            <FormLabel>Importe</FormLabel>
            <FormControl><CurrencyInput value={field.value as any} onChange={field.onChange} currency={form.watch("currency")} /></FormControl>
            <FormMessage />
          </FormItem>)}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="currency" render={({ field }) => (
            <FormItem>
              <FormLabel>Moneda</FormLabel>
              <Select value={field.value} onValueChange={field.onChange} defaultValue={field.value ?? "UYU"}>
                <FormControl><SelectTrigger><SelectValue placeholder="Moneda" /></SelectTrigger></FormControl>
                <SelectContent><SelectItem value="UYU">Peso Uruguayo ($U)</SelectItem><SelectItem value="USD">Dólar (US$)</SelectItem></SelectContent>
              </Select>
              <FormMessage />
            </FormItem>)}
          />
          <FormField control={form.control} name="accountId" render={({ field }) => (
            <FormItem>
              <FormLabel>Cuenta</FormLabel>
              <Select value={field.value?.toString()} onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}>
                <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar cuenta (opcional)" /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value=""><em>Ninguna</em></SelectItem>
                  {accountsData.map((account) => (<SelectItem key={account.id} value={account.id.toString()}>{account.name}</SelectItem>))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>)}
          />
        </div>
        <FormField control={form.control} name="categoryId" render={({ field }) => (
          <FormItem>
            <FormLabel>Categoría</FormLabel>
            <Select value={field.value?.toString()} onValueChange={(value) => {field.onChange(parseInt(value)); loadSuggestionsForCategory(parseInt(value));}}>
              <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar categoría" /></SelectTrigger></FormControl>
              <SelectContent>{filteredCategories.map((category: Category) => (<SelectItem key={category.id} value={category.id.toString()}>{category.name}</SelectItem>))}</SelectContent>
            </Select>
            <FormMessage />
          </FormItem>)}
        />
        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem>
            <FormLabel>Descripción</FormLabel>
            <FormControl><Input placeholder="Ej: Supermercado" {...field} list="suggestions" value={field.value ?? ""} /></FormControl>
            {descriptionSuggestions.length > 0 && (<datalist id="suggestions">{descriptionSuggestions.map((suggestion, index) => (<option key={index} value={suggestion} />))}</datalist>)}
            <FormMessage />
          </FormItem>)}
        />
         <FormField control={form.control} name="date" render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Fecha</FormLabel>
              {/* Using simple input type="date" for brevity. Replace with Calendar if Popover is re-added. */}
              <Input type="date" value={field.value instanceof Date ? format(field.value, "yyyy-MM-dd") : ""} onChange={(e) => field.onChange(new Date(e.target.value))} />
              <FormMessage />
            </FormItem>
          )}/>

        {activeTab === "expense" && (
          <FormField control={form.control} name="isShared" render={({ field }) => (
            <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3">
              <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
              <div className="space-y-1 leading-none"><FormLabel>Gasto del Hogar</FormLabel><FormDescription>Marcar si este gasto es compartido con el hogar.</FormDescription></div>
            </FormItem>)}
          />
        )}
        {activeTab === "income" && (
            <FormField control={form.control} name="isShared" render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3">
                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                <div className="space-y-1 leading-none"><FormLabel>Ingreso al Hogar</FormLabel><FormDescription>Marcar si este ingreso es para los fondos del hogar.</FormDescription></div>
                </FormItem>)}
            />
        )}

        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem>
            <FormLabel>Notas (Opcional)</FormLabel>
            <FormControl><Textarea placeholder="Notas adicionales..." {...field} value={field.value ?? ""} /></FormControl>
            <FormMessage />
          </FormItem>)}
        />
        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onSuccess}>Cancelar</Button>
          <Button type="submit" disabled={createTransactionMutation.isPending || updateTransactionMutation.isPending}
            className={cn(activeTab === "income" ? "bg-green-600 hover:bg-green-700" : activeTab === "expense" ? "bg-red-600 hover:bg-red-700" : "")}
          >
            {(createTransactionMutation.isPending || updateTransactionMutation.isPending) && (<Loader2 className="mr-2 h-4 w-4 animate-spin" />)}
            {editMode ? "Actualizar Transacción" : "Guardar Transacción"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

client/src/pages/transactions-page.tsx
import { useState } from "react";
import { Shell } from "@/components/layout/shell";
// TransactionList seems to be a different component, this page uses its own list logic or a different one.
// For this task, we assume the primary list component is `TransactionListDetailed` (hypothetical name for the one in this file)
// or that `TransactionList` is the one being built here. The prompt implies this page might *use* `TransactionForm`.
// The original file content for `transactions-page.tsx` uses a component named `TransactionList` (imported).
// I'll assume the import refers to `../components/transactions/transaction-list` as fixed in a previous step.
import { TransactionList } from "@/components/transactions/transaction-list";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TransactionForm } from "@/components/transactions/transaction-form"; // Ensure this path is correct
import {
  CreditCard,
  ArrowUpCircle,
  ArrowDownCircle,
  // ArrowLeftRight, // Not used
  Plus
} from "lucide-react";
import type { z } from "zod"; // For Zod types if needed
import type { formTransactionSchema } from "@/schemas/transaction-schema"; // For defaultValues type

// Infer type from schema for defaultValues
type TransactionFormValues = z.infer<typeof formTransactionSchema>;

export default function TransactionsPage() {
  const [isNewTransactionOpen, setIsNewTransactionOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "income" | "expense" | "transfer">("all"); // More specific type

  const handleOpenNewTransactionDialog = (type: "income" | "expense" | "transfer" | "all") => {
    // If "all" is selected, default to "expense" for the form, or could be undefined to let form decide
    let formType: "income" | "expense" | "transfer" = "expense";
    if (type === "income" || type === "expense" || type === "transfer") {
        formType = type;
    }
    setActiveTab(type); // Set activeTab for the list view
    setIsNewTransactionOpen(true);
  };

  return (
    <Shell>
      <PageHeader
        title="Transacciones"
        description="Administra tus ingresos y gastos"
      />

      <div className="container px-2 py-4 max-w-7xl">
        <div className="flex flex-col mb-6">
          {/* Tab buttons for filtering view */}
          <div className="grid w-full grid-cols-3 gap-1 bg-muted rounded-md p-1 mb-3">
            <Button
              variant={activeTab === "all" ? "default" : "ghost"}
              className="flex items-center justify-center py-3 sm:py-6 text-xs sm:text-sm" // Adjusted padding and text size
              onClick={() => setActiveTab("all")}
            >
              <CreditCard className="mr-1 sm:mr-2 h-4 w-4" />
              <span>Todas</span>
            </Button>
            <Button
              variant={activeTab === "income" ? "default" : "ghost"}
              className="flex items-center justify-center py-3 sm:py-6 text-xs sm:text-sm bg-green-100 text-green-800 hover:bg-green-200 data-[state=default]:bg-green-600 data-[state=default]:text-white dark:bg-green-800/30 dark:text-green-300 dark:hover:bg-green-700/40 dark:data-[state=default]:bg-green-600 dark:data-[state=default]:text-white"
              onClick={() => setActiveTab("income")}
            >
              <ArrowUpCircle className="mr-1 sm:mr-2 h-4 w-4" />
              <span>Ingresos</span>
            </Button>
            <Button
              variant={activeTab === "expense" ? "default" : "ghost"}
              className="flex items-center justify-center py-3 sm:py-6 text-xs sm:text-sm bg-red-100 text-red-800 hover:bg-red-200 data-[state=default]:bg-red-600 data-[state=default]:text-white dark:bg-red-800/30 dark:text-red-300 dark:hover:bg-red-700/40 dark:data-[state=default]:bg-red-600 dark:data-[state=default]:text-white"
              onClick={() => setActiveTab("expense")}
            >
              <ArrowDownCircle className="mr-1 sm:mr-2 h-4 w-4" />
              <span>Gastos</span>
            </Button>
          </div>

          <Button 
            onClick={() => handleOpenNewTransactionDialog(activeTab)}
            size="lg"
            className={cn(
                "self-center w-full sm:w-2/3 md:w-1/2 lg:w-1/3", // Responsive width
                activeTab === "income" && "bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800",
                activeTab === "expense" && "bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
            )}
          >
            <Plus className="h-5 w-5 mr-2" />
            <span>
              {activeTab === "income" ? "Nuevo Ingreso" :
               activeTab === "expense" ? "Nuevo Gasto" :
               "Nueva Transacción"}
            </span>
          </Button>
        </div>

        {/* Render TransactionList based on activeTab */}
        {/* Assuming TransactionList component can filter by transactionType prop */}
        <TransactionList transactionType={activeTab} />

      </div>

      <Dialog open={isNewTransactionOpen} onOpenChange={setIsNewTransactionOpen}>
        <DialogContent className="md:max-w-2xl max-h-screen overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Nueva {activeTab === "income" ? "Ingreso" :
                     activeTab === "expense" ? "Gasto" :
                     "Transacción"}
            </DialogTitle>
            <DialogDescription>
              Agrega una nueva transacción a tu registro financiero
            </DialogDescription>
          </DialogHeader>
          <TransactionForm
            onSuccess={() => setIsNewTransactionOpen(false)} // Corrected prop name
            initialTransactionType={activeTab !== "all" ? activeTab : "expense"} // Pass initial type
            // defaultValues prop is optional in TransactionForm,
            // so only pass it if there are specific defaults for new transactions beyond what the form itself handles.
            // For example, if activeTab should preset transactionTypeId:
            defaultValues={{
              transactionTypeId: activeTab === "income" ? 1 : activeTab === "expense" ? 2 : undefined
            } as Partial<TransactionFormValues>}
          />
        </DialogContent>
      </Dialog>
    </Shell>
  );
}
