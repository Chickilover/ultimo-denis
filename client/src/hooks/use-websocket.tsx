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
    const wsUrl = `${protocol}//${window.location.host}/ws?userId=${user.id}`;

    // Crear conexión WebSocket
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log('Conexión WebSocket establecida');
      setIsConnected(true);
      setReconnectAttempt(0);
    };

    socket.onmessage = (event) => {
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

    socket.onclose = () => {
      console.log('Conexión WebSocket cerrada');
      setIsConnected(false);

      // Reconectar automáticamente después de un tiempo
      const maxReconnectAttempts = 5;
      const reconnectDelay = Math.min(1000 * Math.pow(2, reconnectAttempt), 30000); // Exponential backoff

      if (reconnectAttempt < maxReconnectAttempts) {
        setTimeout(() => {
          setReconnectAttempt((prev) => prev + 1);
        }, reconnectDelay);
      } else {
        toast({
          title: 'Error de conexión',
          description: 'No se pudo establecer conexión para actualizaciones en tiempo real',
          variant: 'destructive'
        });
      }
    };

    socket.onerror = (error) => {
      console.error('Error en WebSocket:', error);
      toast({
        title: 'Error de conexión',
        description: 'Ocurrió un error en la conexión en tiempo real',
        variant: 'destructive'
      });
    };

    // Limpiar al desmontar
    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [user, reconnectAttempt, toast]);

  return {
    isConnected,
    sendMessage,
    registerMessageHandler
  };
}
