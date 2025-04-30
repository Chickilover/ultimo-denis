import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

export interface UserBalance {
  personalBalance: number;
  familyBalance: number;
}

export interface BalanceTransfer {
  id: number;
  userId: number;
  fromPersonal: boolean;
  amount: number;
  currency: string;
  description?: string;
  date: string;
  createdAt: string;
}

export interface TransferData {
  fromPersonal: boolean;
  amount: number;
  currency: string;
  description?: string;
}

export function useBalance() {
  const { toast } = useToast();
  const { user } = useAuth();

  // Obtener el balance del usuario
  const {
    data: balance,
    isLoading: isBalanceLoading,
    error: balanceError,
  } = useQuery<UserBalance>({
    queryKey: ["/api/user/balance"],
    enabled: !!user,
  });

  // Obtener el historial de transferencias
  const {
    data: transfers,
    isLoading: isTransfersLoading,
    error: transfersError,
  } = useQuery<BalanceTransfer[]>({
    queryKey: ["/api/balance-transfers"],
    enabled: !!user,
  });

  // Mutación para crear una transferencia
  const createTransferMutation = useMutation({
    mutationFn: async (data: TransferData) => {
      const response = await apiRequest("POST", "/api/balance-transfers", data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al realizar la transferencia");
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidar consultas para actualizar los datos
      queryClient.invalidateQueries({ queryKey: ["/api/user/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/balance-transfers"] });
      
      toast({
        title: "Transferencia exitosa",
        description: "La transferencia se ha realizado correctamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    balance,
    transfers,
    isBalanceLoading,
    isTransfersLoading,
    balanceError,
    transfersError,
    createTransfer: createTransferMutation.mutate,
    isTransferring: createTransferMutation.isPending,
  };
}