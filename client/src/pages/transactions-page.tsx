import { useState } from "react";
import { Shell } from "@/components/layout/shell";
import { TransactionList } from "@/components/transactions/transaction-list";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TransactionForm } from "@/components/transactions/transaction-form";

export default function TransactionsPage() {
  const [isNewTransactionOpen, setIsNewTransactionOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  
  return (
    <Shell>
      <div className="container px-4 py-6 max-w-7xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">
            {activeTab === "all" && "Transacciones"}
            {activeTab === "income" && "Ingresos"}
            {activeTab === "expense" && "Gastos"}
            {activeTab === "transfer" && "Transferencias"}
          </h1>
          <Button 
            onClick={() => {
              setIsNewTransactionOpen(true);
              // Preseleccionar el tipo de transacción según la pestaña actual
              if (activeTab === "income" || activeTab === "expense" || activeTab === "transfer") {
                // El formulario leerá este valor y ajustará la pestaña activa
              }
            }}
          >
            + Nueva {activeTab === "income" ? "Ingreso" : 
                     activeTab === "expense" ? "Gasto" : 
                     activeTab === "transfer" ? "Transferencia" : 
                     "Transacción"}
          </Button>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid w-full grid-cols-4 max-w-md">
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="income">Ingresos</TabsTrigger>
            <TabsTrigger value="expense">Gastos</TabsTrigger>
            <TabsTrigger value="transfer">Transferencias</TabsTrigger>
          </TabsList>
          <TabsContent value="all">
            <TransactionList transactionType="all" />
          </TabsContent>
          <TabsContent value="income">
            <TransactionList transactionType="income" />
          </TabsContent>
          <TabsContent value="expense">
            <TransactionList transactionType="expense" />
          </TabsContent>
          <TabsContent value="transfer">
            <TransactionList transactionType="transfer" />
          </TabsContent>
        </Tabs>
        
        <Dialog open={isNewTransactionOpen} onOpenChange={setIsNewTransactionOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nueva transacción</DialogTitle>
              <DialogDescription>
                Completa el formulario para registrar una nueva transacción.
              </DialogDescription>
            </DialogHeader>
            <TransactionForm 
              onComplete={() => setIsNewTransactionOpen(false)}
              defaultValues={{
                transactionTypeId: 
                  activeTab === "income" ? 1 : 
                  activeTab === "expense" ? 2 : 
                  activeTab === "transfer" ? 3 : 2 // Por defecto gastos si no se especifica
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
    </Shell>
  );
}
