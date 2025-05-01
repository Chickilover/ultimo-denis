import { randomBytes } from 'crypto';
import { storage } from './storage';

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
 */
export function generateInvitationCode(
  userId: number, 
  username: string,
  householdId: number | null = null,
  invitedUsername: string
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
 */
export function consumeInvitationCode(code: string): boolean {
  if (invitations.has(code)) {
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