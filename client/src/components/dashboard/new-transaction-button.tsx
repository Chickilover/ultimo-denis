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

export function NewTransactionButton({ variant = "default" }: { variant?: "default" | "floating" }) {
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
                <DropdownMenuItem className="flex items-center gap-2" onClick={() => handleOpenDialog("income", true)}>
                  <HomeIcon className="w-4 h-4 text-green-600" />
                  <span>Ingreso del hogar</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center gap-2" onClick={() => handleOpenDialog("income", false)}>
                  <UserCircle className="w-4 h-4 text-green-600" />
                  <span>Ingreso personal</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TooltipProvider>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {transactionType === "expense" ? "Nuevo gasto" : "Nuevo ingreso"} 
                {isShared ? " del hogar" : " personal"}
              </DialogTitle>
            </DialogHeader>
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
      <div className="flex flex-col gap-2 md:flex-row md:gap-3">
        <Button 
          variant="default" 
          size="sm"
          className="flex-1 bg-red-600 hover:bg-red-700 gap-2"
          onClick={() => handleOpenDialog("expense", false)}
        >
          <CreditCard className="h-4 w-4" />
          <span>Gasto personal</span>
        </Button>
        
        <Button 
          variant="default" 
          size="sm"
          className="flex-1 bg-red-600 hover:bg-red-700 gap-2"
          onClick={() => handleOpenDialog("expense", true)}
        >
          <HomeIcon className="h-4 w-4" />
          <span>Gasto del hogar</span>
        </Button>
        
        <Button 
          variant="default" 
          size="sm"
          className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
          onClick={() => handleOpenDialog("income", false)}
        >
          <UserCircle className="h-4 w-4" />
          <span>Ingreso personal</span>
        </Button>
        
        <Button 
          variant="default" 
          size="sm"
          className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
          onClick={() => handleOpenDialog("income", true)}
        >
          <Banknote className="h-4 w-4" />
          <span>Ingreso del hogar</span>
        </Button>
      </div>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {transactionType === "expense" ? "Nuevo gasto" : "Nuevo ingreso"} 
              {isShared ? " del hogar" : " personal"}
            </DialogTitle>
          </DialogHeader>
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