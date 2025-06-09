import { useState } from "react";
import { Shell } from "@/components/layout/shell";
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
import { TransactionForm } from "@/components/transactions/transaction-form";
import { 
  CreditCard, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { z } from "zod";
// Assuming formTransactionSchema is the one used to define TransactionFormValues in transaction-form.tsx
import type { formTransactionSchema as baseFormTransactionSchema } from "@/schemas/transaction-schema";

type TransactionFormValues = z.infer<typeof baseFormTransactionSchema>;
type ActiveTransactionType = "all" | "income" | "expense" | "transfer";


export default function TransactionsPage() {
  const [isNewTransactionOpen, setIsNewTransactionOpen] = useState(false);
  // activeTab is for filtering the list displayed on this page
  const [activeTab, setActiveTab] = useState<ActiveTransactionType>("all");

  // formTransactionType determines the initial state of the TransactionForm when opened
  const [formTransactionType, setFormTransactionType] = useState<'income' | 'expense' | 'transfer'>('expense');

  const handleOpenNewTransactionDialog = (currentViewTab: ActiveTransactionType) => {
    // Set the activeTab for the list view (if it's different, though usually triggered by tab buttons)
    setActiveTab(currentViewTab);

    // Determine the type for the new transaction form
    if (currentViewTab === "income" || currentViewTab === "expense" || currentViewTab === "transfer") {
      setFormTransactionType(currentViewTab);
    } else {
      setFormTransactionType("expense"); // Default to 'expense' if current view is 'all'
    }
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
          <div className="grid w-full grid-cols-3 gap-1 bg-muted rounded-md p-1 mb-3">
            <Button 
              variant={activeTab === "all" ? "default" : "ghost"}
              className="flex items-center justify-center py-3 sm:py-6 text-xs sm:text-sm"
              onClick={() => setActiveTab("all")}
            >
              <CreditCard className="mr-1 sm:mr-2 h-4 w-4" />
              <span>Todas</span>
            </Button>
            <Button 
              variant={activeTab === "income" ? "default" : "ghost"}
              className={cn(
                "flex items-center justify-center py-3 sm:py-6 text-xs sm:text-sm",
                "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-800/30 dark:text-green-300 dark:hover:bg-green-700/40",
                activeTab === "income" && "bg-green-600 text-white dark:bg-green-600 dark:text-white" // This is data-state=active equivalent
              )}
              onClick={() => setActiveTab("income")}
            >
              <ArrowUpCircle className="mr-1 sm:mr-2 h-4 w-4" />
              <span>Ingresos</span>
            </Button>
            <Button 
              variant={activeTab === "expense" ? "default" : "ghost"}
              className={cn(
                "flex items-center justify-center py-3 sm:py-6 text-xs sm:text-sm",
                "bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-800/30 dark:text-red-300 dark:hover:bg-red-700/40",
                activeTab === "expense" && "bg-red-600 text-white dark:bg-red-600 dark:text-white" // This is data-state=active equivalent
              )}
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
                "self-center w-full sm:w-2/3 md:w-1/2 lg:w-1/3",
                // Button color based on the type of form that will open
                formTransactionType === "income" && activeTab === "income" && "bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800",
                formTransactionType === "expense" && activeTab === "expense" && "bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800",
                // Default color if tab is 'all' or 'transfer'
                (activeTab === "all" || activeTab === "transfer") && "bg-primary hover:bg-primary/90"
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
        
        <TransactionList transactionType={activeTab} />

      </div>
      
      <Dialog open={isNewTransactionOpen} onOpenChange={setIsNewTransactionOpen}>
        <DialogContent className="md:max-w-2xl max-h-screen overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Nueva {formTransactionType === "income" ? "Ingreso" :
                     formTransactionType === "expense" ? "Gasto" :
                     "Transferencia"} {/* Assuming transfer might be an option */}
            </DialogTitle>
            <DialogDescription>
              Agrega una nueva transacción a tu registro financiero
            </DialogDescription>
          </DialogHeader>
          <TransactionForm 
            onSuccess={() => setIsNewTransactionOpen(false)}
            initialTransactionType={formTransactionType}
            defaultValues={{ // This provides initial values to the form
              transactionTypeId: formTransactionType === "income" ? 1 : formTransactionType === "expense" ? 2 : 3, // 3 for transfer
              // date: new Date(), // The form itself defaults date to new Date()
              // currency: "UYU", // The form itself defaults currency
            } as Partial<TransactionFormValues>} // Cast to ensure compatibility
          />
        </DialogContent>
      </Dialog>
    </Shell>
  );
}