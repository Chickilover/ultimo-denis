import { useState } from "react";
import { Shell } from "@/components/layout/shell";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { TransactionsList } from "@/components/transactions/transactions-list";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { PageHeader } from "@/components/layout/page-header";

export default function ExpensesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <Shell>
      <PageHeader
        title="Gastos"
        description="Administra los gastos de tu hogar"
        actions={
          <Button onClick={() => setIsDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nuevo Gasto
          </Button>
        }
      />

      <TransactionsList transactionType="expense" />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <div className="space-y-4 py-2 pb-4">
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-center">Nuevo Gasto</h2>
            </div>
            <TransactionForm 
              onComplete={() => setIsDialogOpen(false)}
              defaultValues={{ transactionTypeId: 2 }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}