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
import type { Transaction, Category, Tag, Account, InsertTransaction } from "@shared/schema"; // Removed User as it's not directly used here besides user.id

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
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

// This is the type for the form values, derived from the Zod schema.
type TransactionFormValues = z.infer<typeof baseFormTransactionSchema>;

interface TransactionFormProps {
  onSuccess?: () => void;
  defaultValues?: Partial<TransactionFormValues>;
  editMode?: boolean;
  transactionId?: number;
  initialTransactionType?: 'income' | 'expense' | 'transfer';
}

export function TransactionForm({ 
  onSuccess,
  defaultValues: propsDefaultValues, // Renamed to avoid conflict in useMemo
  editMode = false,
  transactionId,
  initialTransactionType = 'expense'
}: TransactionFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  let determinedInitialTab = initialTransactionType;
  if (propsDefaultValues?.transactionTypeId === 1) determinedInitialTab = "income";
  else if (propsDefaultValues?.transactionTypeId === 2) determinedInitialTab = "expense";
  else if (propsDefaultValues?.transactionTypeId === 3) determinedInitialTab = "transfer";

  const [activeTab, setActiveTab] = useState<'income' | 'expense' | 'transfer'>(determinedInitialTab);
  const [descriptionSuggestions, setDescriptionSuggestions] = useState<string[]>([]);
  
  const formDefaultValues = useMemo(() => {
    const base: Partial<TransactionFormValues> = {
      userId: user?.id,
      transactionTypeId: activeTab === "income" ? 1 : activeTab === "expense" ? 2 : 3,
      amount: 0,
      currency: "UYU",
      description: "",
      date: new Date(),
      time: null,
      accountId: null,
      notes: "",
      receiptUrl: null,
      isShared: false,
      isReconciled: false,
      isReimbursable: false,
      isReimbursed: false,
    };

    let processedDefaults = { ...base, ...propsDefaultValues };

    if (propsDefaultValues?.date) {
      // Ensure date is a Date object if it comes as string or number
      processedDefaults.date = new Date(propsDefaultValues.date);
    }
    if (propsDefaultValues?.amount !== undefined) {
       // Ensure amount is a number for form state, as CurrencyInput's onChange provides a number
       processedDefaults.amount = Number(propsDefaultValues.amount);
    }
    // Ensure categoryId is a number if present
    if (propsDefaultValues?.categoryId !== undefined && propsDefaultValues.categoryId !== null) {
        processedDefaults.categoryId = Number(propsDefaultValues.categoryId);
    }
    // Ensure accountId is a number or null
    if (propsDefaultValues?.accountId !== undefined) {
        processedDefaults.accountId = propsDefaultValues.accountId ? Number(propsDefaultValues.accountId) : null;
    }

    return processedDefaults;
  }, [propsDefaultValues, user?.id, activeTab]);

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(baseFormTransactionSchema),
    defaultValues: formDefaultValues
  });
  
  useEffect(() => {
    // Reset form with new default values if propsDefaultValues changes (e.g., when editing different transactions)
    // or if the user context changes (though less common for userId to change here)
    // or if activeTab changes the transactionTypeId default
    form.reset(formDefaultValues);
  }, [formDefaultValues, form]);

  const { data: categoriesData = [] } = useQuery<Category[]>({ // Removed Error, Category[], QueryKey as they can be inferred
    queryKey: ["/api/categories"], queryFn: getQueryFn({ on401: "throw" }), initialData: []
  });
  
  const { data: tagsData = [] } = useQuery<Tag[]>({ // Removed Error, Tag[], QueryKey
    queryKey: ["/api/tags"], queryFn: getQueryFn({ on401: "throw" }), initialData: []
  });

  const { data: accountsData = [] } = useQuery<Account[]>({ // Removed Error, Account[], QueryKey
    queryKey: ["/api/accounts"], queryFn: getQueryFn({ on401: "throw" }), initialData: []
  });
  
  const createTransactionMutation = useMutation<Transaction, Error, InsertTransaction>({
    mutationFn: (data) => apiRequest<Transaction>("POST", "/api/transactions", data),
    onSuccess: (createdTransaction) => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      // Potentially invalidate other queries like accounts if balance is affected server-side
      if (createdTransaction.accountId) {
        queryClient.invalidateQueries({ queryKey: ["/api/accounts", createdTransaction.accountId] });
        queryClient.invalidateQueries({ queryKey: ["/api/accounts"] }); // Broader invalidation for accounts list
      }
      toast({ title: "Transacción creada", description: `"${createdTransaction.description}" registrada.` });
      if (onSuccess) onSuccess();
      form.reset(); // Reset form after successful creation
    },
    onError: (error) => toast({ title: "Error", description: `Error al crear la transacción: ${error.message}`, variant: "destructive" }),
  });
  
  const updateTransactionMutation = useMutation<Transaction, Error, Partial<InsertTransaction> & { id: number }>({
    mutationFn: (data) => apiRequest<Transaction>("PUT", `/api/transactions/${data.id}`, data),
    onSuccess: (updatedTransaction) => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions", updatedTransaction.id] });
      if (updatedTransaction.accountId) {
        queryClient.invalidateQueries({ queryKey: ["/api/accounts", updatedTransaction.accountId] });
        queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      }
      const oldAccountId = propsDefaultValues?.accountId;
      if (oldAccountId && oldAccountId !== updatedTransaction.accountId) {
         queryClient.invalidateQueries({ queryKey: ["/api/accounts", oldAccountId] });
      }
      toast({ title: "Transacción actualizada", description: `"${updatedTransaction.description}" actualizada.` });
      if (onSuccess) onSuccess();
    },
    onError: (error) => toast({ title: "Error", description: `Error al actualizar la transacción: ${error.message}`, variant: "destructive" }),
  });
  
  const watchedTransactionTypeId = form.watch("transactionTypeId");
  const watchedCurrency = form.watch("currency");

  useEffect(() => {
    if (watchedTransactionTypeId === 1 && activeTab !== "income") setActiveTab("income");
    else if (watchedTransactionTypeId === 2 && activeTab !== "expense") setActiveTab("expense");
    else if (watchedTransactionTypeId === 3 && activeTab !== "transfer") setActiveTab("transfer");
  }, [watchedTransactionTypeId, activeTab]);
  
  useEffect(() => {
    // Only set transactionTypeId if it's different to avoid re-renders or potential loops
    const currentFormTypeId = form.getValues("transactionTypeId");
    const targetTypeId = activeTab === "income" ? 1 : activeTab === "expense" ? 2 : 3;
    if (currentFormTypeId !== targetTypeId) {
      form.setValue("transactionTypeId", targetTypeId);
    }
  }, [activeTab, form]);
  
  const filteredCategories = useMemo(() => {
    return categoriesData.filter((category: Category) => {
      if (activeTab === "income") return category.isIncome;
      if (activeTab === "expense") return !category.isIncome;
      // For "transfer", typically specific categories are used, or allow all if not specialized.
      // This depends on how transfer categories are set up. Assuming all non-income for now or specific ones.
      // If transfers have dedicated categories, filter for those. Otherwise, might show all or none.
      // For now, let's assume transfers don't typically use categories in this form or use expense categories.
      if (activeTab === "transfer") return !category.isIncome; // Example: transfers deduct from a category
      return true;
    });
  }, [categoriesData, activeTab]);
  
  const loadSuggestionsForCategory = (categoryId: number | null) => {
    if (categoryId === null) {
      setDescriptionSuggestions([]);
      return;
    }
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
    if (data.categoryId === null || data.categoryId === undefined) {
        toast({ title: "Error de validación", description: "Por favor, seleccione una categoría.", variant: "destructive" });
        return;
    }

    const apiData: InsertTransaction = {
      ...data, // Spread validated form data
      userId: user.id,
      amount: String(data.amount), // API expects string for numeric
      date: data.date, // Already a Date object
      time: data.time || null,
      accountId: data.accountId || null,
      notes: data.notes || "", // Ensure empty string if null/undefined from form
      receiptUrl: data.receiptUrl || null,
      isReimbursable: activeTab === "expense" ? (data.isReimbursable || false) : false,
      // isReimbursed is part of form data
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
        {/* Amount Field */}
        <FormField control={form.control} name="amount" render={({ field }) => (
          <FormItem>
            <FormLabel>Importe</FormLabel>
            <FormControl>
              <CurrencyInput
                value={typeof field.value === 'number' ? String(field.value) : "0"}
                onChange={(stringValue) => field.onChange(parseFloat(stringValue) || 0)}
                currency={watchedCurrency}
              />
            </FormControl>
            <FormMessage />
          </FormItem>)}
        />
        {/* Currency and Account Fields */}
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="currency" render={({ field }) => (
            <FormItem>
              <FormLabel>Moneda</FormLabel>
              <Select value={field.value ?? "UYU"} onValueChange={field.onChange} defaultValue="UYU">
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent><SelectItem value="UYU">Peso Uruguayo ($U)</SelectItem><SelectItem value="USD">Dólar (US$)</SelectItem></SelectContent>
              </Select>
              <FormMessage />
            </FormItem>)}
          />
          <FormField control={form.control} name="accountId" render={({ field }) => (
            <FormItem>
              <FormLabel>Cuenta</FormLabel>
              <Select
                value={field.value?.toString() ?? ""}
                onValueChange={(value) => field.onChange(value ? parseInt(value, 10) : null)}
              >
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
        {/* Category Field */}
        <FormField control={form.control} name="categoryId" render={({ field }) => (
          <FormItem>
            <FormLabel>Categoría</FormLabel>
            <Select
              value={field.value?.toString() ?? ""}
              onValueChange={(value) => {
                const numValue = parseInt(value, 10);
                field.onChange(numValue);
                loadSuggestionsForCategory(numValue);
              }}
            >
              <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar categoría" /></SelectTrigger></FormControl>
              <SelectContent>{filteredCategories.map((category) => (<SelectItem key={category.id} value={category.id.toString()}>{category.name}</SelectItem>))}</SelectContent>
            </Select>
            <FormMessage />
          </FormItem>)}
        />
        {/* Description Field */}
        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem>
            <FormLabel>Descripción</FormLabel>
            <FormControl><Input placeholder="Ej: Supermercado" {...field} list="suggestions" value={field.value ?? ""} /></FormControl>
            {descriptionSuggestions.length > 0 && (<datalist id="suggestions">{descriptionSuggestions.map((suggestion, index) => (<option key={index} value={suggestion} />))}</datalist>)}
            <FormMessage />
          </FormItem>)}
        />
        {/* Date Field */}
         <FormField control={form.control} name="date" render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Fecha</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  value={field.value instanceof Date ? format(field.value, "yyyy-MM-dd") : ""}
                  onChange={(e) => {
                    // Ensure time is preserved if field.value was already a Date object, otherwise set to T00:00:00
                    const newDate = e.target.value ? new Date(e.target.value + "T00:00:00") : null;
                    field.onChange(newDate);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}/>

        {/* isShared Checkbox (conditional) */}
        {(activeTab === "expense" || activeTab === "income") && (
          <FormField control={form.control} name="isShared" render={({ field }) => (
            <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3">
              <FormControl><Checkbox checked={field.value ?? false} onCheckedChange={field.onChange} /></FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>{activeTab === "expense" ? "Gasto del Hogar" : "Ingreso al Hogar"}</FormLabel>
                <FormDescription>
                  {activeTab === "expense"
                    ? "Marcar si este gasto es compartido con el hogar."
                    : "Marcar si este ingreso es para los fondos del hogar."}
                </FormDescription>
              </div>
            </FormItem>)}
          />
        )}
        {/* Notes Field */}
        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem>
            <FormLabel>Notas (Opcional)</FormLabel>
            <FormControl><Textarea placeholder="Notas adicionales..." {...field} value={field.value ?? ""} /></FormControl>
            <FormMessage />
          </FormItem>)}
        />
        {/* Submit and Cancel Buttons */}
        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onSuccess} disabled={createTransactionMutation.isPending || updateTransactionMutation.isPending}>Cancelar</Button>
          <Button type="submit" disabled={createTransactionMutation.isPending || updateTransactionMutation.isPending}
            className={cn(activeTab === "income" ? "bg-green-600 hover:bg-green-700" : activeTab === "expense" ? "bg-red-600 hover:bg-red-700" : "bg-primary hover:bg-primary/90")}
          >
            {(createTransactionMutation.isPending || updateTransactionMutation.isPending) && (<Loader2 className="mr-2 h-4 w-4 animate-spin" />)}
            {editMode ? "Actualizar Transacción" : "Guardar Transacción"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
