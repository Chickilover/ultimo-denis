import { randomBytes } from 'crypto';
import { storage } from './storage';

// Almacén en memoria para invitaciones activas
// clave: código de invitación, valor: { userId, expires, householdId, email }
const invitations = new Map<string, {
  userId: number;
  email: string;
  expires: Date;
  householdId: number | null;
}>();

// Duración de la invitación: 7 días
const INVITATION_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Genera un nuevo código de invitación para un miembro familiar
 */
export function generateInvitationCode(
  userId: number, 
  email: string,
  householdId: number | null = null
): string {
  // Limpiar invitaciones expiradas
  cleanupExpiredInvitations();
  
  // Verificar si ya existe una invitación para este email
  for (const [code, invitation] of invitations.entries()) {
    if (
      invitation.userId === userId &&
      invitation.email === email &&
      invitation.householdId === householdId
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
    email,
    expires,
    householdId
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
  email?: string;
  householdId?: number | null;
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
    email: invitation.email,
    householdId: invitation.householdId
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
  for (const [code, invitation] of invitations.entries()) {
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
  email: string; 
  expires: Date;
  householdId: number | null;
}[] {
  const result: { 
    code: string; 
    email: string; 
    expires: Date;
    householdId: number | null;
  }[] = [];
  
  const now = new Date();
  for (const [code, invitation] of invitations.entries()) {
    if (invitation.userId === userId && invitation.expires > now) {
      result.push({
        code,
        email: invitation.email,
        expires: invitation.expires,
        householdId: invitation.householdId
      });
    }
  }
  
  return result;
}