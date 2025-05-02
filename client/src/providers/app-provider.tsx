import { ReactNode, createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocket, WebSocketMessageType } from "@/hooks/use-websocket";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";

type AppContextType = {
  isWebSocketConnected: boolean;
};

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { isConnected, registerMessageHandler } = useWebSocket();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Registrar manejadores para diferentes tipos de mensajes WebSocket
  useEffect(() => {
    if (!user) return;

    // Manejador para actualizaciones de balance
    const balanceUpdateHandler = registerMessageHandler(
      WebSocketMessageType.BALANCE_UPDATE,
      (payload) => {
        // Invalidar la consulta de balance para que se recargue
        queryClient.invalidateQueries({ queryKey: ["/api/user/balance"] });
        
        toast({
          title: "Balance actualizado",
          description: "Tu balance ha sido actualizado",
          duration: 3000,
        });
      }
    );

    // Manejador para transacciones creadas
    const transactionCreatedHandler = registerMessageHandler(
      WebSocketMessageType.TRANSACTION_CREATED,
      (payload) => {
        // Invalidar la consulta de transacciones para que se recargue
        queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
        
        toast({
          title: "Nueva transacción",
          description: "Se ha registrado una nueva transacción",
          duration: 3000,
        });
      }
    );

    // Manejador para transacciones actualizadas
    const transactionUpdatedHandler = registerMessageHandler(
      WebSocketMessageType.TRANSACTION_UPDATED,
      (payload) => {
        // Invalidar la consulta de transacciones para que se recargue
        queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
        // También invalidar la transacción específica
        if (payload.id) {
          queryClient.invalidateQueries({ queryKey: ["/api/transactions", payload.id.toString()] });
        }
        
        toast({
          title: "Transacción actualizada",
          description: "Una transacción ha sido actualizada",
          duration: 3000,
        });
      }
    );

    // Manejador para transacciones eliminadas
    const transactionDeletedHandler = registerMessageHandler(
      WebSocketMessageType.TRANSACTION_DELETED,
      (payload) => {
        // Invalidar la consulta de transacciones para que se recargue
        queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
        
        toast({
          title: "Transacción eliminada",
          description: "Una transacción ha sido eliminada",
          duration: 3000,
        });
      }
    );

    // Manejador para invitaciones creadas
    const invitationCreatedHandler = registerMessageHandler(
      WebSocketMessageType.INVITATION_CREATED,
      (payload) => {
        // Invalidar la consulta de invitaciones para que se recargue
        queryClient.invalidateQueries({ queryKey: ["/api/invitations"] });
        
        toast({
          title: "Nueva invitación",
          description: "Has recibido una invitación para unirte a un hogar",
          duration: 5000,
        });
      }
    );

    // Manejador para invitaciones aceptadas
    const invitationAcceptedHandler = registerMessageHandler(
      WebSocketMessageType.INVITATION_ACCEPTED,
      (payload) => {
        // Invalidar la consulta de invitaciones para que se recargue
        queryClient.invalidateQueries({ queryKey: ["/api/invitations"] });
        // También invalidar la lista de miembros familiares
        queryClient.invalidateQueries({ queryKey: ["/api/family-members"] });
        
        toast({
          title: "Invitación aceptada",
          description: `${payload.username || 'Alguien'} se ha unido a tu hogar`,
          duration: 5000,
        });
      }
    );

    // Limpiar manejadores al desmontar
    return () => {
      balanceUpdateHandler();
      transactionCreatedHandler();
      transactionUpdatedHandler();
      transactionDeletedHandler();
      invitationCreatedHandler();
      invitationAcceptedHandler();
    };
  }, [user, registerMessageHandler, queryClient, toast]);

  const value: AppContextType = {
    isWebSocketConnected: isConnected,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp debe ser usado dentro de un AppProvider");
  }
  return context;
}
