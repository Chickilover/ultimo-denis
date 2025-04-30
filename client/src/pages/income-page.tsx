import { useState, useCallback, useRef } from "react";
import { Shell } from "@/components/layout/shell";
import { Button } from "@/components/ui/button";
import { TransactionsList } from "@/components/transactions/transactions-list";
import { PlusCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription } from "@/components/ui/dialog";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { PageHeader } from "@/components/layout/page-header";

export default function IncomePage() {
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
    transactionTypeId: 1, // Tipo ingreso
    currency: "UYU", // Moneda uruguaya por defecto
    isShared: false,
    date: new Date()
  };

  return (
    <Shell>
      <PageHeader
        title="Ingresos"
        description="Registra tus ingresos y distribuye fondos entre gastos personales y del hogar"
        actions={
          <Button onClick={handleOpenDialog}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nuevo Ingreso
          </Button>
        }
      />

      <TransactionsList transactionType="income" />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" aria-describedby="income-dialog-description">
          <div className="space-y-4 py-2 pb-4">
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-center">Nuevo Ingreso</h2>
              <DialogDescription id="income-dialog-description" className="text-center">
                Registra un nuevo ingreso y elige si destinarlo a gastos personales o compartidos
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