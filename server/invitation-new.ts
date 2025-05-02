import { randomBytes } from 'crypto';
import { storage } from './storage';
import { notifyUser, WebSocketMessageType } from './websocket';

// Almacén en memoria para invitaciones activas
// clave: código de invitación, valor: { userId, expires, householdId, username, invitedUsername }
const invitations = new Map<string, {
  userId: number;
  username: string;
  expires: Date;
  householdId: number | null;
  invitedUsername: string;
}>();

// Duración de la invitación: 7 días
const INVITATION_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Genera un nuevo código de invitación para un miembro familiar
 * @param userId ID del usuario que crea la invitación
 * @param username Nombre del usuario que crea la invitación
 * @param householdId ID del hogar (opcional)
 * @param invitedUsername Nombre del usuario invitado
 * @param notifyViaWebSocket Indica si se debe notificar al usuario invitado
 */
export function generateInvitationCode(
  userId: number, 
  username: string,
  householdId: number | null = null,
  invitedUsername: string,
  notifyViaWebSocket: boolean = false
): string {
  // Limpiar invitaciones expiradas
  cleanupExpiredInvitations();

  // Verificar si ya existe una invitación para este usuario
  // Usar Array.from para evitar problemas con MapIterator
  const entries = Array.from(invitations.entries());
  for (const [code, invitation] of entries) {
    if (
      invitation.userId === userId &&
      invitation.username === username &&
      invitation.householdId === householdId &&
      invitation.invitedUsername === invitedUsername
    ) {
      // Si ya existe y aún no ha expirado, devolvemos el mismo código
      if (invitation.expires > new Date()) {
        return code;
      }
      // Si expiró, la eliminaremos y crearemos una nueva
      invitations.delete(code);
      break;
    }
  }

  // Generar código único de 8 caracteres
  const code = randomBytes(4).toString('hex');

  // Establecer fecha de expiración (7 días)
  const expires = new Date();
  expires.setTime(expires.getTime() + INVITATION_EXPIRES_MS);

  // Guardar invitación
  invitations.set(code, {
    userId,
    username,
    expires,
    householdId,
    invitedUsername
  });

  // Notificar via WebSocket si está habilitado
  if (notifyViaWebSocket) {
    // Buscar el usuario por nombre de usuario para obtener su ID
    storage.getUserByUsername(invitedUsername)
      .then(invitedUser => {
        if (invitedUser) {
          // Enviar notificación al usuario invitado
          notifyUser(invitedUser.id, {
            type: WebSocketMessageType.INVITATION_CREATED,
            payload: {
              code,
              inviter: {
                userId,
                username
              },
              expires
            }
          });
          
          console.log(`Notificación de invitación enviada a ${invitedUsername} (ID: ${invitedUser.id})`);
        }
      })
      .catch(error => {
        console.error(`Error al notificar al usuario ${invitedUsername}:`, error);
      });
  }

  return code;
}

/**
 * Valida un código de invitación
 * Si es válido, retorna la información asociada
 */
export function validateInvitationCode(code: string): { 
  valid: boolean; 
  userId?: number; 
  username?: string;
  householdId?: number | null;
  invitedUsername?: string;
} {
  // Código no existe
  if (!invitations.has(code)) {
    return { valid: false };
  }

  const invitation = invitations.get(code)!;

  // Verificar si ha expirado
  if (invitation.expires < new Date()) {
    invitations.delete(code);
    return { valid: false };
  }

  return {
    valid: true,
    userId: invitation.userId,
    username: invitation.username,
    householdId: invitation.householdId,
    invitedUsername: invitation.invitedUsername
  };
}

/**
 * Consume un código de invitación (lo elimina tras usarlo)
 * @param code El código de invitación a consumir
 * @param acceptedByUser Información del usuario que acepta la invitación
 * @param notifyInviter Indica si se debe notificar al usuario que creó la invitación
 */
export function consumeInvitationCode(
  code: string, 
  acceptedByUser?: { id: number, username: string }, 
  notifyInviter: boolean = false
): boolean {
  if (invitations.has(code)) {
    const invitation = invitations.get(code)!;
    
    // Notificar al creador de la invitación si está habilitado y hay datos del usuario que acepta
    if (notifyInviter && acceptedByUser) {
      notifyUser(invitation.userId, {
        type: WebSocketMessageType.INVITATION_ACCEPTED,
        payload: {
          username: acceptedByUser.username,
          userId: acceptedByUser.id,
          invitedUsername: invitation.invitedUsername
        }
      });
      
      console.log(`Notificación de aceptación de invitación enviada a usuario ${invitation.userId}`);
    }
    
    invitations.delete(code);
    return true;
  }
  return false;
}

/**
 * Elimina invitaciones expiradas
 */
function cleanupExpiredInvitations() {
  const now = new Date();
  // Usar Array.from para evitar problemas con MapIterator
  const entriesArray = Array.from(invitations.entries());
  for (const [code, invitation] of entriesArray) {
    if (invitation.expires < now) {
      invitations.delete(code);
    }
  }
}

/**
 * Obtiene las invitaciones activas para un usuario
 */
export function getActiveInvitationsForUser(userId: number): { 
  code: string; 
  username: string; 
  expires: Date;
  householdId: number | null;
  invitedUsername: string;
}[] {
  const result: { 
    code: string; 
    username: string; 
    expires: Date;
    householdId: number | null;
    invitedUsername: string;
  }[] = [];

  const now = new Date();
  // Usar Array.from para evitar problemas con MapIterator
  const entriesArray = Array.from(invitations.entries());
  for (const [code, invitation] of entriesArray) {
    if (invitation.userId === userId && invitation.expires > now) {
      result.push({
        code,
        username: invitation.username,
        expires: invitation.expires,
        householdId: invitation.householdId,
        invitedUsername: invitation.invitedUsername
      });
    }
  }

  return result;
}