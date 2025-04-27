import { ReactNode, useState } from "react";
import { MobileNav } from "./mobile-nav";
import { Sidebar } from "./sidebar";
import { Button } from "@/components/ui/button";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { 
  Dialog, 
  DialogContent
} from "@/components/ui/dialog";

interface ShellProps {
  children: ReactNode;
}

export function Shell({ children }: ShellProps) {
  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Navigation */}
      <MobileNav onOpenTransactionForm={() => setIsTransactionFormOpen(true)} />
      
      {/* Desktop Sidebar */}
      <Sidebar className="hidden md:flex" />
      
      {/* Main Content */}
      <main className="pt-16 pb-16 md:pb-0 md:pl-64">
        {children}
        
        {/* Add Transaction FAB on desktop */}
        <div className="fixed bottom-6 right-6 hidden md:block">
          <Button 
            size="lg" 
            className="rounded-full shadow-lg"
            onClick={() => setIsTransactionFormOpen(true)}
          >
            + Nueva Transacción
          </Button>
        </div>
      </main>
      
      {/* Transaction Form Dialog */}
      <Dialog open={isTransactionFormOpen} onOpenChange={setIsTransactionFormOpen}>
        <DialogContent className="max-w-lg">
          <TransactionForm onComplete={() => setIsTransactionFormOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
