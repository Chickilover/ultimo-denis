import { useState } from "react";
import { Plus, CreditCard, Banknote, UserCircle, HomeIcon } from "lucide-react";
import { TransactionForm } from "../transactions/transaction-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function NewTransactionButton({ 
  variant = "default", 
  className = "" 
}: { 
  variant?: "default" | "floating", 
  className?: string 
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<"expense" | "income">("expense");
  const [isShared, setIsShared] = useState(false);
  
  const handleOpenDialog = (type: "expense" | "income", shared: boolean) => {
    setTransactionType(type);
    setIsShared(shared);
    setIsDialogOpen(true);
  };
  
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
  };
  
  // Valores por defecto para el formulario según el tipo de transacción
  const getDefaultValues = () => {
    return {
      transactionTypeId: transactionType === "income" ? 1 : 2,
      isShared: isShared,
    };
  };
  
  if (variant === "floating") {
    return (
      <>
        <div className="fixed bottom-6 right-6 flex flex-col gap-2">
          <TooltipProvider>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon" className="h-14 w-14 rounded-full shadow-lg">
                      <Plus className="h-7 w-7" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Nueva transacción</TooltipContent>
                </Tooltip>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="flex items-center gap-2" onClick={() => handleOpenDialog("expense", true)}>
                  <HomeIcon className="w-4 h-4 text-primary" />
                  <span>Gasto del hogar</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center gap-2" onClick={() => handleOpenDialog("expense", false)}>
                  <UserCircle className="w-4 h-4 text-primary" />
                  <span>Gasto personal</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center gap-2" onClick={() => handleOpenDialog("income", false)}>
                  <Banknote className="w-4 h-4 text-green-600" />
                  <span>Registrar ingreso</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TooltipProvider>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto" aria-describedby="transaction-dialog-description">
            <DialogHeader>
              <DialogTitle>
                {transactionType === "expense" 
                  ? `Nuevo gasto${isShared ? " del hogar" : " personal"}`
                  : "Registrar ingreso"}
              </DialogTitle>
            </DialogHeader>
            <p id="transaction-dialog-description" className="sr-only">
              Formulario para registrar una nueva transacción
            </p>
            <TransactionForm 
              onComplete={handleCloseDialog} 
              defaultValues={getDefaultValues()} 
            />
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={handleCloseDialog} className="mt-2">
                Cancelar
              </Button>
            </DialogClose>
          </DialogContent>
        </Dialog>
      </>
    );
  }
  
  return (
    <>
      <div className="flex flex-col gap-3 md:flex-row md:gap-4">
        <Button 
          variant="outline" 
          size="default"
          className="flex-1 border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-700 hover:border-red-600 gap-2 rounded-xl h-14 shadow-sm transition-all duration-200 hover:shadow-md"
          onClick={() => handleOpenDialog("expense", false)}
        >
          <div className="bg-red-100 dark:bg-red-900/30 p-1.5 rounded-full">
            <CreditCard className="h-4 w-4 text-red-500" />
          </div>
          <span>Gasto personal</span>
        </Button>
        
        <Button 
          variant="outline" 
          size="default"
          className="flex-1 border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-700 hover:border-red-600 gap-2 rounded-xl h-14 shadow-sm transition-all duration-200 hover:shadow-md"
          onClick={() => handleOpenDialog("expense", true)}
        >
          <div className="bg-red-100 dark:bg-red-900/30 p-1.5 rounded-full">
            <HomeIcon className="h-4 w-4 text-red-500" />
          </div>
          <span>Gasto del hogar</span>
        </Button>
        
        <Button 
          variant="outline" 
          size="default"
          className="flex-1 border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20 hover:text-green-700 hover:border-green-600 gap-2 rounded-xl h-14 shadow-sm transition-all duration-200 hover:shadow-md"
          onClick={() => handleOpenDialog("income", false)}
        >
          <div className="bg-green-100 dark:bg-green-900/30 p-1.5 rounded-full">
            <Banknote className="h-4 w-4 text-green-500" />
          </div>
          <span>Registrar ingreso</span>
        </Button>
      </div>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto" aria-describedby="transaction-dialog-description-main">
          <DialogHeader>
            <DialogTitle>
              {transactionType === "expense" 
                ? `Nuevo gasto${isShared ? " del hogar" : " personal"}`
                : "Registrar ingreso"}
            </DialogTitle>
          </DialogHeader>
          <p id="transaction-dialog-description-main" className="sr-only">
            Formulario para registrar una nueva transacción
          </p>
          <TransactionForm 
            onComplete={handleCloseDialog} 
            defaultValues={getDefaultValues()} 
          />
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={handleCloseDialog} className="mt-2">
              Cancelar
            </Button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    </>
  );
}