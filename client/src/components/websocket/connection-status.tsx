import { useApp } from "@/providers/app-provider";
import { Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { WebSocketMessageType } from "@/hooks/use-websocket";

interface WebSocketStatusProps {
  compact?: boolean;
}

export function WebSocketStatus({ compact = false }: WebSocketStatusProps) {
  const { isWebSocketConnected, lastMessages } = useApp();
  
  // Filtrar mensajes recientes (últimos 5 minutos)
  const recentMessages = lastMessages.filter(
    msg => msg.timestamp && Date.now() - msg.timestamp < 5 * 60 * 1000
  );
  const recentMessagesCount = recentMessages.length;
  
  // Generar texto para el tooltip
  const getTooltipText = () => {
    if (!isWebSocketConnected) {
      return "Sin conexión para actualizaciones en tiempo real";
    }
    
    if (recentMessagesCount === 0) {
      return "Conectado para actualizaciones en tiempo real";
    }
    
    // Contar por tipo de mensaje
    const invitationsCreated = recentMessages.filter(msg => 
      msg.type === WebSocketMessageType.INVITATION_CREATED
    ).length;
    
    const invitationsAccepted = recentMessages.filter(msg => 
      msg.type === WebSocketMessageType.INVITATION_ACCEPTED
    ).length;
    
    const transactionsCreated = recentMessages.filter(msg => 
      msg.type === WebSocketMessageType.TRANSACTION_CREATED
    ).length;
    
    return (
      "Conectado para actualizaciones en tiempo real\n" +
      (invitationsCreated > 0 ? `${invitationsCreated} invitaciones recibidas\n` : "") +
      (invitationsAccepted > 0 ? `${invitationsAccepted} invitaciones aceptadas\n` : "") +
      (transactionsCreated > 0 ? `${transactionsCreated} transacciones nuevas` : "")
    );
  };
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center relative">
            {isWebSocketConnected ? (
              <>
                <Wifi className="h-4 w-4 text-green-500" />
                {recentMessagesCount > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 text-[9px] text-white justify-center items-center">
                      {recentMessagesCount}
                    </span>
                  </span>
                )}
              </>
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            
            {!compact && (
              <span 
                className={cn(
                  "ml-1 text-xs",
                  isWebSocketConnected ? "text-green-500" : "text-red-500"
                )}
              >
                {isWebSocketConnected ? "Conectado" : "Desconectado"}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="whitespace-pre-line">
            {getTooltipText()}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
