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
          <h1 className="text-2xl font-bold">Transacciones</h1>
          <Button onClick={() => setIsNewTransactionOpen(true)}>
            + Nueva Transacción
          </Button>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid w-full grid-cols-4 max-w-md">
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="income">Ingresos</TabsTrigger>
            <TabsTrigger value="expense">Gastos</TabsTrigger>
            <TabsTrigger value="transfer">Transferencias</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <TransactionList />
        
        <Dialog open={isNewTransactionOpen} onOpenChange={setIsNewTransactionOpen}>
          <DialogContent className="max-w-lg">
            <TransactionForm onComplete={() => setIsNewTransactionOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
    </Shell>
  );
}
