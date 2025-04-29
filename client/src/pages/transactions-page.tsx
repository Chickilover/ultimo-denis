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
  ArrowLeftRight,
  Plus
} from "lucide-react";

export default function TransactionsPage() {
  const [isNewTransactionOpen, setIsNewTransactionOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  
  return (
    <Shell>
      <PageHeader
        title="Transacciones"
        description="Administra tus ingresos y gastos"
      />
      
      <div className="container px-2 py-4 max-w-7xl">
        <div className="flex justify-between items-center mb-6">
          <div className="grid w-full grid-cols-4 gap-1 bg-muted rounded-md p-1">
            <Button 
              variant={activeTab === "all" ? "default" : "ghost"}
              className="flex items-center justify-center"
              onClick={() => setActiveTab("all")}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              <span className="hidden md:inline">Todas</span>
              <span className="md:hidden">Todas</span>
            </Button>
            <Button 
              variant={activeTab === "income" ? "default" : "ghost"}
              className="flex items-center justify-center"
              onClick={() => setActiveTab("income")}
            >
              <ArrowUpCircle className="mr-2 h-4 w-4" />
              <span className="hidden md:inline">Ingresos</span>
              <span className="md:hidden">Ingresos</span>
            </Button>
            <Button 
              variant={activeTab === "expense" ? "default" : "ghost"}
              className="flex items-center justify-center"
              onClick={() => setActiveTab("expense")}
            >
              <ArrowDownCircle className="mr-2 h-4 w-4" />
              <span className="hidden md:inline">Gastos</span>
              <span className="md:hidden">Gastos</span>
            </Button>
            <Button 
              variant={activeTab === "transfer" ? "default" : "ghost"}
              className="flex items-center justify-center"
              onClick={() => setActiveTab("transfer")}
            >
              <ArrowLeftRight className="mr-2 h-4 w-4" />
              <span className="hidden md:inline">Transf.</span>
              <span className="md:hidden">Transf.</span>
            </Button>
          </div>
          
          <Button 
            onClick={() => {
              setIsNewTransactionOpen(true);
            }}
            size="sm"
            className="ml-2 shrink-0"
          >
            <Plus className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">
              {activeTab === "income" ? "Ingreso" : 
               activeTab === "expense" ? "Gasto" : 
               activeTab === "transfer" ? "Transferencia" : 
               "Transacción"}
            </span>
            <span className="sm:hidden">Nuevo</span>
          </Button>
        </div>
        
        {activeTab === "all" && <TransactionList transactionType="all" />}
        {activeTab === "income" && <TransactionList transactionType="income" />}
        {activeTab === "expense" && <TransactionList transactionType="expense" />}
        {activeTab === "transfer" && <TransactionList transactionType="transfer" />}
      </div>
      
      <Dialog open={isNewTransactionOpen} onOpenChange={setIsNewTransactionOpen}>
        <DialogContent className="md:max-w-2xl max-h-screen overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Nueva {activeTab === "income" ? "Ingreso" : 
                     activeTab === "expense" ? "Gasto" : 
                     activeTab === "transfer" ? "Transferencia" : 
                     "Transacción"}
            </DialogTitle>
            <DialogDescription>
              Agrega una nueva transacción a tu registro financiero
            </DialogDescription>
          </DialogHeader>
          <TransactionForm 
            onSuccess={() => setIsNewTransactionOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </Shell>
  );
}