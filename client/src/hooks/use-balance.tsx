import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export interface UserBalance {
  personalBalance: number;
  familyBalance: number;
  id?: number;
}

export interface BalanceTransfer {
  id: number;
  date: string;
  fromPersonal: boolean;
  amount: number;
  currency: string;
  description: string | null;
  userId: number;
}

export interface TransferData {
  fromPersonal: boolean;
  amount: number;
  currency: string;
  description?: string;
}

export function useBalance() {
  const { toast } = useToast();

  // Obtener el balance del usuario
  const {
    data: balance,
    isLoading: isBalanceLoading,
    error: balanceError,
  } = useQuery<UserBalance>({
    queryKey: ["/api/balance"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/balance");
      if (!response.ok) throw new Error("Error al obtener el balance");
      return response.json();
    },
  });

  // Obtener historial de transferencias
  const {
    data: transfers,
    isLoading: isTransfersLoading,
    error: transfersError,
  } = useQuery<BalanceTransfer[]>({
    queryKey: ["/api/balance/transfers"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/balance/transfers");
      if (!response.ok) throw new Error("Error al obtener las transferencias");
      return response.json();
    },
  });

  // Mutation para realizar una transferencia
  const {
    mutate: createTransfer,
    isPending: isTransferring,
    error: transferError,
  } = useMutation({
    mutationFn: async (data: TransferData) => {
      const response = await apiRequest("POST", "/api/balance/transfer", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Error al realizar la transferencia");
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidar consultas de balance y transferencias para actualizar los datos
      queryClient.invalidateQueries({ queryKey: ["/api/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/balance/transfers"] });
      
      toast({
        title: "Transferencia exitosa",
        description: "La transferencia se ha realizado correctamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error en la transferencia",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    balance,
    isBalanceLoading,
    balanceError,
    transfers,
    isTransfersLoading,
    transfersError,
    createTransfer,
    isTransferring,
    transferError,
  };
}