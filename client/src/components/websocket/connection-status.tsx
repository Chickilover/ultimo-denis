import { useApp } from "@/providers/app-provider";
import { Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function WebSocketStatus() {
  const { isWebSocketConnected } = useApp();
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center">
            {isWebSocketConnected ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            <span 
              className={cn(
                "ml-1 text-xs",
                isWebSocketConnected ? "text-green-500" : "text-red-500"
              )}
            >
              {isWebSocketConnected ? "Conectado" : "Desconectado"}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {isWebSocketConnected
            ? "Conectado para actualizaciones en tiempo real"
            : "Sin conexión para actualizaciones en tiempo real"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
