import { ReactNode, useState } from "react";
import { MobileNav } from "./mobile-nav";
import { Sidebar } from "./sidebar";
import { Button } from "@/components/ui/button";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { NewTransactionButton } from "@/components/dashboard/new-transaction-button";
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
      <main className="pt-16 pb-16 md:pb-0 md:pl-72">
        <div className="px-4 py-6">
          {children}
        </div>
        
        {/* Add Transaction FAB on desktop */}
        <div className="hidden md:block">
          <NewTransactionButton variant="floating" />
        </div>
      </main>
      
      {/* Transaction Form Dialog */}
      <Dialog open={isTransactionFormOpen} onOpenChange={setIsTransactionFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold mb-2">Nueva transacción</h2>
            <p className="text-sm text-muted-foreground mb-4">Completa el formulario para registrar una nueva transacción.</p>
            <TransactionForm onComplete={() => setIsTransactionFormOpen(false)} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
