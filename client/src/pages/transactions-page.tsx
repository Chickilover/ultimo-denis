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
        <div className="flex flex-col mb-6">
          <div className="grid w-full grid-cols-3 gap-1 bg-muted rounded-md p-1 mb-3">
            <Button 
              variant={activeTab === "all" ? "default" : "ghost"}
              className="flex items-center justify-center py-6"
              onClick={() => setActiveTab("all")}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              <span>Todas</span>
            </Button>
            <Button 
              variant={activeTab === "income" ? "default" : "ghost"}
              className="flex items-center justify-center py-6 bg-green-100 text-green-800 hover:bg-green-200 data-[state=default]:bg-green-600 data-[state=default]:text-white"
              onClick={() => setActiveTab("income")}
            >
              <ArrowUpCircle className="mr-2 h-4 w-4" />
              <span>Ingresos</span>
            </Button>
            <Button 
              variant={activeTab === "expense" ? "default" : "ghost"}
              className="flex items-center justify-center py-6 bg-red-100 text-red-800 hover:bg-red-200 data-[state=default]:bg-red-600 data-[state=default]:text-white"
              onClick={() => setActiveTab("expense")}
            >
              <ArrowDownCircle className="mr-2 h-4 w-4" />
              <span>Gastos</span>
            </Button>
          </div>
          
          <Button 
            onClick={() => {
              setIsNewTransactionOpen(true);
            }}
            size="lg"
            className={activeTab === "income" 
              ? "bg-green-600 hover:bg-green-700 self-center w-2/3" 
              : activeTab === "expense" 
              ? "bg-red-600 hover:bg-red-700 self-center w-2/3" 
              : "self-center w-2/3"
            }
          >
            <Plus className="h-5 w-5 mr-2" />
            <span>
              {activeTab === "income" ? "Nuevo Ingreso" : 
               activeTab === "expense" ? "Nuevo Gasto" : 
               "Nueva Transacción"}
            </span>
          </Button>
        </div>
        
        {activeTab === "all" && <TransactionList transactionType="all" />}
        {activeTab === "income" && <TransactionList transactionType="income" />}
        {activeTab === "expense" && <TransactionList transactionType="expense" />}
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
            onSuccess={() => setIsNewTransactionOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </Shell>
  );
}