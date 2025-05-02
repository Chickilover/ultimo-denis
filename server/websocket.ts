import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { parse } from 'url';

// Mapa para almacenar conexiones activas por userId
const connections = new Map<number, WebSocket[]>();

// Tipos de mensajes que se pueden enviar/recibir
export enum WebSocketMessageType {
  BALANCE_UPDATE = 'BALANCE_UPDATE',
  TRANSACTION_CREATED = 'TRANSACTION_CREATED',
  TRANSACTION_UPDATED = 'TRANSACTION_UPDATED',
  TRANSACTION_DELETED = 'TRANSACTION_DELETED',
  INVITATION_CREATED = 'INVITATION_CREATED',
  INVITATION_ACCEPTED = 'INVITATION_ACCEPTED',
  CONNECTION_ESTABLISHED = 'CONNECTION_ESTABLISHED'
}

// Interfaz para los mensajes de WebSocket
export interface WebSocketMessage {
  type: WebSocketMessageType;
  payload: any;
}

// Configurar el servidor WebSocket
export function setupWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ 
    server, 
    path: '/ws',
    clientTracking: true
  });
  
  console.log('Servidor WebSocket inicializado');
  
  wss.on('connection', (ws, req) => {
    console.log('Nueva conexión WebSocket recibida');
    
    // Extraer el userId del query string
    const { query } = parse(req.url || '', true);
    const userId = query.userId ? parseInt(query.userId as string) : null;
    
    if (userId) {
      // Guardar la conexión en el mapa
      if (!connections.has(userId)) {
        connections.set(userId, []);
      }
      connections.get(userId)?.push(ws);
      
      console.log(`Usuario ${userId} conectado`);
      
      // Enviar mensaje de bienvenida
      ws.send(JSON.stringify({
        type: WebSocketMessageType.CONNECTION_ESTABLISHED,
        payload: { message: 'Conectado exitosamente al servidor de Nido Financiero' }
      }));
      
      // Manejar cierre de conexión
      ws.on('close', () => {
        console.log(`Conexión cerrada para usuario ${userId}`);
        // Eliminar la conexión del mapa
        const userConnections = connections.get(userId);
        if (userConnections) {
          const index = userConnections.indexOf(ws);
          if (index !== -1) {
            userConnections.splice(index, 1);
          }
          
          // Si no quedan conexiones para este usuario, eliminarlo del mapa
          if (userConnections.length === 0) {
            connections.delete(userId);
          }
        }
      });
      
      // Manejar mensajes recibidos
      ws.on('message', (message) => {
        try {
          const parsedMessage = JSON.parse(message.toString()) as WebSocketMessage;
          console.log(`Mensaje recibido de usuario ${userId}:`, parsedMessage);
          
          // Procesar el mensaje según su tipo
          // Aquí podrías implementar lógica específica para cada tipo de mensaje
        } catch (error) {
          console.error('Error al procesar mensaje WebSocket:', error);
        }
      });
      
      // Manejar errores
      ws.on('error', (error) => {
        console.error(`Error en WebSocket para usuario ${userId}:`, error);
      });
    } else {
      // Si no se proporciona userId, cerrar la conexión
      console.log('Conexión rechazada: No se proporcionó userId');
      ws.close(1008, 'Se requiere userId para establecer conexión');
    }
  });
  
  return wss;
}

// Función para notificar a un usuario específico
export function notifyUser(userId: number, message: WebSocketMessage) {
  const userConnections = connections.get(userId);
  if (userConnections && userConnections.length > 0) {
    const messageStr = JSON.stringify(message);
    
    userConnections.forEach(connection => {
      if (connection.readyState === WebSocket.OPEN) {
        connection.send(messageStr);
      }
    });
    
    console.log(`Notificación enviada a usuario ${userId}:`, message.type);
    return true;
  }
  
  console.log(`Usuario ${userId} no está conectado, no se envió notificación`);
  return false;
}

// Función para notificar a todos los miembros de un hogar
export function notifyHousehold(householdId: number | null, message: WebSocketMessage, excludeUserId?: number) {
  if (!householdId) return false;
  
  // Esta es una implementación simplificada
  // En una implementación real, obtendrías todos los usuarios con el mismo householdId de la base de datos
  // y enviarías la notificación a cada uno
  
  // Por ahora, simplemente enviaremos a todas las conexiones excepto el que origina el mensaje
  let notified = false;
  
  connections.forEach((userConnections, userId) => {
    // Excluir al remitente si se especifica
    if (excludeUserId && userId === excludeUserId) return;
    
    // Aquí deberías verificar si el usuario pertenece al householdId
    // Por ahora, enviamos a todos (excepto al remitente) como ejemplo
    const messageStr = JSON.stringify(message);
    
    userConnections.forEach(connection => {
      if (connection.readyState === WebSocket.OPEN) {
        connection.send(messageStr);
        notified = true;
      }
    });
  });
  
  return notified;
}
