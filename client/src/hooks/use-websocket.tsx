import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './use-auth';
import { useToast } from './use-toast';

// Tipos de mensajes que se pueden recibir del servidor
export enum WebSocketMessageType {
  BALANCE_UPDATE = 'BALANCE_UPDATE',
  TRANSACTION_CREATED = 'TRANSACTION_CREATED',
  TRANSACTION_UPDATED = 'TRANSACTION_UPDATED',
  TRANSACTION_DELETED = 'TRANSACTION_DELETED',
  INVITATION_CREATED = 'INVITATION_CREATED',
  INVITATION_ACCEPTED = 'INVITATION_ACCEPTED',
  CONNECTION_ESTABLISHED = 'CONNECTION_ESTABLISHED'
}

export interface WebSocketMessage {
  type: WebSocketMessageType;
  payload: any;
}

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const { user } = useAuth();
  const { toast } = useToast();
  const socketRef = useRef<WebSocket | null>(null);
  const messageHandlersRef = useRef<Map<WebSocketMessageType, ((payload: any) => void)[]>>(
    new Map()
  );

  // Función para enviar mensajes al servidor
  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  // Función para registrar manejadores de mensajes
  const registerMessageHandler = useCallback(
    (type: WebSocketMessageType, handler: (payload: any) => void) => {
      if (!messageHandlersRef.current.has(type)) {
        messageHandlersRef.current.set(type, []);
      }
      messageHandlersRef.current.get(type)?.push(handler);

      // Devuelve una función para eliminar el manejador
      return () => {
        const handlers = messageHandlersRef.current.get(type);
        if (handlers) {
          const index = handlers.indexOf(handler);
          if (index !== -1) {
            handlers.splice(index, 1);
          }
        }
      };
    },
    []
  );

  useEffect(() => {
    // Solo iniciar WebSocket si el usuario está autenticado
    if (!user) {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    // Configuración del protocolo WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    
    // Manejar el entorno de Replit específicamente
    // En Replit, necesitamos usar la URL completa para el WebSocket
    let wsUrl = `${protocol}//${window.location.host}/ws?userId=${user.id}`;
    
    // Si estamos en Replit, asegurarnos de que usamos el dominio HTTPS completo
    if (window.location.hostname.includes('replit.dev') || window.location.hostname.includes('repl.co')) {
      // Asegurarse de que estamos usando wss: en Replit
      wsUrl = `wss://${window.location.host}/ws?userId=${user.id}`;
      console.log('Entorno Replit detectado, usando URL WSS completa');
    }
    
    console.log('Intentando conectar WebSocket a:', wsUrl);
    
    // Crear conexión WebSocket con manejo de errores
    let socket: WebSocket;
    
    const connectWebSocket = () => {
      try {
        socket = new WebSocket(wsUrl);
        socketRef.current = socket;
        
        socket.onopen = () => {
          console.log('Conexión WebSocket establecida');
          setIsConnected(true);
          setReconnectAttempt(0);
        };
        
        socket.onmessage = (event: MessageEvent) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            console.log('Mensaje WebSocket recibido:', message);
    
            // Si es un mensaje de conexión establecida, mostrar toast
            if (message.type === WebSocketMessageType.CONNECTION_ESTABLISHED) {
              toast({
                title: 'Conexión establecida',
                description: 'Estás conectado para actualizaciones en tiempo real',
                duration: 3000
              });
            }
    
            // Ejecutar los manejadores registrados para este tipo de mensaje
            const handlers = messageHandlersRef.current.get(message.type);
            if (handlers && handlers.length > 0) {
              handlers.forEach((handler) => handler(message.payload));
            }
          } catch (error) {
            console.error('Error al procesar mensaje WebSocket:', error);
          }
        };
    
        socket.onclose = (event) => {
          console.log('Conexión WebSocket cerrada', event.code, event.reason);
          setIsConnected(false);
    
          // Verificar si el cierre fue normal (código 1000) o si debemos intentar reconectar
          const normalClosure = event.code === 1000;
          
          if (normalClosure) {
            console.log('Conexión WebSocket cerrada normalmente, no se intentará reconectar');
            return;
          }
          
          // Reconectar automáticamente después de un tiempo
          const maxReconnectAttempts = 10; // Aumentamos el número de intentos para Replit
          
          // Usar backoff exponencial pero con un poco de aleatoriedad para evitar tormentas de reconexión
          const baseDelay = 1000 * Math.pow(1.5, reconnectAttempt); 
          const jitter = Math.random() * 1000;
          const reconnectDelay = Math.min(baseDelay + jitter, 30000); // Cap at 30 seconds
    
          if (reconnectAttempt < maxReconnectAttempts) {
            console.log(`Intentando reconectar (intento ${reconnectAttempt + 1} de ${maxReconnectAttempts}) en ${Math.round(reconnectDelay/1000)}s...`);
            
            // En Replit, es posible que necesitemos reconstruir la URL del WebSocket
            // si ha cambiado el dominio o el protocolo
            setTimeout(() => {
              setReconnectAttempt((prev) => prev + 1);
              connectWebSocket(); // Intentar reconectar
            }, reconnectDelay);
          } else {
            toast({
              title: 'Error de conexión',
              description: 'No se pudo establecer conexión para actualizaciones en tiempo real. Intenta recargar la página.',
              variant: 'destructive',
              duration: 8000 // Mostrar por más tiempo
            });
          }
        };
    
        socket.onerror = (error) => {
          console.error('Error en WebSocket:', error);
        };
      } catch (error) {
        console.error('Error al crear conexión WebSocket:', error);
        toast({
          title: 'Error de conexión',
          description: 'No se pudo establecer la conexión en tiempo real',
          variant: 'destructive'
        });
      }
    };
    
    // Iniciar la conexión
    connectWebSocket();

    // Limpiar al desmontar
    return () => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [user, reconnectAttempt, toast]);

  return {
    isConnected,
    sendMessage,
    registerMessageHandler
  };
}
