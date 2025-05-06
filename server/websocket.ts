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
  // Configuración específica para Replit
  const wss = new WebSocketServer({ 
    server, 
    path: '/ws',
    clientTracking: true,
    // Configuraciones adicionales para mejorar la estabilidad en Replit
    perMessageDeflate: {
      zlibDeflateOptions: {
        chunkSize: 1024,
        memLevel: 7,
        level: 3
      },
      zlibInflateOptions: {
        chunkSize: 10 * 1024
      },
      clientNoContextTakeover: true,
      serverNoContextTakeover: true,
      serverMaxWindowBits: 10,
      concurrencyLimit: 10,
      threshold: 1024
    }
  });
  
  console.log('Servidor WebSocket inicializado en Replit');
  
  // Manejo de errores a nivel de servidor
  wss.on('error', (error) => {
    console.error('Error en el servidor WebSocket:', error);
  });
  
  // Manejo de conexiones
  wss.on('connection', (ws, req) => {
    console.log('Nueva conexión WebSocket recibida desde:', req.socket.remoteAddress);
    
    // Extraer el userId del query string
    const { query } = parse(req.url || '', true);
    const userId = query.userId ? parseInt(query.userId as string) : null;
    
    if (userId) {
      // Guardar la conexión en el mapa
      if (!connections.has(userId)) {
        connections.set(userId, []);
      }
      connections.get(userId)?.push(ws);
      
      console.log(`Usuario ${userId} conectado. Conexiones activas: ${connections.get(userId)?.length}`);
      
      // Implementar un ping/pong para mantener la conexión viva
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
        } else {
          clearInterval(pingInterval);
        }
      }, 30000);
      
      // Enviar mensaje de bienvenida
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({
            type: WebSocketMessageType.CONNECTION_ESTABLISHED,
            payload: { message: 'Conectado exitosamente al servidor de Nido Financiero' }
          }));
        } catch (sendError) {
          console.error(`Error al enviar mensaje de bienvenida a usuario ${userId}:`, sendError);
        }
      }
      
      // Manejar cierre de conexión
      ws.on('close', (code, reason) => {
        console.log(`Conexión cerrada para usuario ${userId}. Código: ${code}, Razón: ${reason || 'No especificada'}`);
        clearInterval(pingInterval);
        
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
            console.log(`Usuario ${userId} desconectado completamente`);
          } else {
            console.log(`Usuario ${userId} tiene ${userConnections.length} conexiones activas restantes`);
          }
        }
      });
      
      // Manejar pong (respuesta a ping)
      ws.on('pong', () => {
        // console.log(`Pong recibido de usuario ${userId}`);
      });
      
      // Manejar mensajes recibidos
      ws.on('message', (message) => {
        try {
          const parsedMessage = JSON.parse(message.toString()) as WebSocketMessage;
          console.log(`Mensaje recibido de usuario ${userId}:`, parsedMessage.type);
          
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
      try {
        ws.close(1008, 'Se requiere userId para establecer conexión');
      } catch (closeError) {
        console.error('Error al cerrar conexión rechazada:', closeError);
      }
    }
  });
  
  // Configurar limpieza periódica de conexiones
  setInterval(() => {
    let totalConnections = 0;
    connections.forEach((userConnections, userId) => {
      // Filtrar conexiones cerradas
      const activeConnections = userConnections.filter(
        conn => conn.readyState === WebSocket.OPEN
      );
      
      // Actualizar la lista de conexiones
      if (activeConnections.length === 0) {
        connections.delete(userId);
      } else if (activeConnections.length !== userConnections.length) {
        connections.set(userId, activeConnections);
      }
      
      totalConnections += activeConnections.length;
    });
    
    console.log(`Limpieza WebSocket: ${totalConnections} conexiones activas para ${connections.size} usuarios`);
  }, 60000); // Ejecutar cada minuto
  
  return wss;
}

// Función para notificar a un usuario específico
export function notifyUser(userId: number, message: WebSocketMessage) {
  const userConnections = connections.get(userId);
  if (userConnections && userConnections.length > 0) {
    const messageStr = JSON.stringify(message);
    let sentCount = 0;
    
    userConnections.forEach(connection => {
      if (connection.readyState === WebSocket.OPEN) {
        try {
          connection.send(messageStr);
          sentCount++;
        } catch (error) {
          console.error(`Error al enviar notificación a usuario ${userId}:`, error);
        }
      }
    });
    
    if (sentCount > 0) {
      console.log(`Notificación enviada a usuario ${userId} (${sentCount} conexiones): ${message.type}`);
      return true;
    } else {
      console.log(`No se pudo enviar notificación a ninguna conexión del usuario ${userId}`);
      return false;
    }
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
