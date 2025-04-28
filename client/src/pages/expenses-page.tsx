import { useState, useCallback, useRef } from "react";
import { Shell } from "@/components/layout/shell";
import { Button } from "@/components/ui/button";
import { TransactionsList } from "@/components/transactions/transactions-list";
import { PlusCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription } from "@/components/ui/dialog";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { PageHeader } from "@/components/layout/page-header";

export default function ExpensesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const dialogOpenRef = useRef(false);
  
  // Use memoized handlers to prevent re-renders
  const handleOpenDialog = useCallback(() => {
    if (!dialogOpenRef.current) {
      dialogOpenRef.current = true;
      setIsDialogOpen(true);
    }
  }, []);
  
  const handleCloseDialog = useCallback(() => {
    setIsDialogOpen(false);
    // Reseteamos el ref después de un breve retraso para evitar re-aperturas accidentales
    setTimeout(() => {
      dialogOpenRef.current = false;
    }, 300);
  }, []);
  
  // Prepara los valores por defecto para el formulario una sola vez
  const defaultFormValues = {
    transactionTypeId: 2, // Tipo gasto
    currency: "UYU", // Moneda uruguaya por defecto
    isShared: false,
    date: new Date()
  };

  return (
    <Shell>
      <PageHeader
        title="Gastos"
        description="Administra tus gastos personales y familiares"
        actions={
          <Button onClick={handleOpenDialog}>
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
              <DialogDescription className="text-center">
                Registra un nuevo gasto en tu cuenta
              </DialogDescription>
            </div>
            <TransactionForm 
              onComplete={handleCloseDialog}
              defaultValues={defaultFormValues}
            />
          </div>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}