import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  console.warn("SENDGRID_API_KEY no está definida. El envío de correos no funcionará correctamente.");
}

// Configurar el servicio de correo
const mailService = new MailService();
if (process.env.SENDGRID_API_KEY) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
} else {
  console.error('SENDGRID_API_KEY no está definida. El servicio de correo no funcionará correctamente.');
}

// Dirección de correo desde la cual se enviarán los mensajes
const FROM_EMAIL = 'info@nidofinanciero.com' as string;
const FROM_NAME = 'Nido Financiero' as string;

/**
 * Envía un correo electrónico utilizando SendGrid
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}): Promise<boolean> {
  try {
    // Si no hay API key configurada, simulamos el envío en desarrollo
    if (!process.env.SENDGRID_API_KEY) {
      console.log('======= SIMULACIÓN DE CORREO ELECTRÓNICO =======');
      console.log(`Para: ${params.to}`);
      console.log(`Asunto: ${params.subject}`);
      console.log(`Cuerpo (texto): ${params.text?.substring(0, 100)}...`);
      console.log('==============================================');
      return true;
    }
    
    await mailService.send({
      to: params.to,
      from: {
        email: FROM_EMAIL,
        name: FROM_NAME,
      },
      subject: params.subject,
      text: params.text || '',
      html: params.html || '',
    });
    return true;
  } catch (error) {
    console.error('Error al enviar correo electrónico:', error);
    return false;
  }
}

/**
 * Envía un correo de restablecimiento de contraseña
 */
export async function sendPasswordResetEmail(params: {
  to: string;
  token: string;
  username: string;
}): Promise<boolean> {
  const resetUrl = `${process.env.APP_URL || 'http://localhost:5000'}/reset-password?token=${params.token}`;
  
  const subject = 'Restablecimiento de contraseña - Nido Financiero';
  
  const text = `
    Hola ${params.username},
    
    Has solicitado restablecer tu contraseña en Nido Financiero.
    
    Para crear una nueva contraseña, haz clic en el siguiente enlace:
    ${resetUrl}
    
    Este enlace expirará en 1 hora.
    
    Si no solicitaste este cambio, puedes ignorar este correo electrónico.
    
    Saludos,
    El equipo de Nido Financiero
  `;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #6366f1; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0;">Nido Financiero</h1>
      </div>
      <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
        <p>Hola <strong>${params.username}</strong>,</p>
        
        <p>Has solicitado restablecer tu contraseña en Nido Financiero.</p>
        
        <p>Para crear una nueva contraseña, haz clic en el siguiente botón:</p>
        
        <p style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Restablecer contraseña
          </a>
        </p>
        
        <p>O copia y pega este enlace en tu navegador:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        
        <p><em>Este enlace expirará en 1 hora.</em></p>
        
        <p>Si no solicitaste este cambio, puedes ignorar este correo electrónico.</p>
        
        <p>Saludos,<br>
        El equipo de Nido Financiero</p>
      </div>
      <div style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280;">
        &copy; ${new Date().getFullYear()} Nido Financiero. Todos los derechos reservados.
      </div>
    </div>
  `;
  
  return sendEmail({
    to: params.to,
    subject,
    text,
    html,
  });
}

/**
 * Envía un correo de invitación para unirse a un hogar familiar
 */
export async function sendFamilyInvitationEmail(params: {
  to: string;
  inviterName: string;
  invitationCode: string;
}): Promise<boolean> {
  const invitationUrl = `${process.env.APP_URL || 'http://localhost:5000'}/join-family?code=${params.invitationCode}`;
  
  const subject = 'Invitación para unirte a un hogar en Nido Financiero';
  
  const text = `
    Hola,
    
    ${params.inviterName} te ha invitado a unirte a su grupo familiar en Nido Financiero.
    
    Nido Financiero es una aplicación que te ayuda a gestionar tus finanzas personales y familiares.
    
    Para aceptar la invitación, haz clic en el siguiente enlace:
    ${invitationUrl}
    
    O si ya tienes una cuenta, puedes ingresar este código de invitación:
    ${params.invitationCode}
    
    ¡Gracias!
    El equipo de Nido Financiero
  `;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #6366f1; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0;">Nido Financiero</h1>
      </div>
      <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
        <p>Hola,</p>
        
        <p><strong>${params.inviterName}</strong> te ha invitado a unirte a su grupo familiar en Nido Financiero.</p>
        
        <p>Nido Financiero es una aplicación que te ayuda a gestionar tus finanzas personales y familiares.</p>
        
        <p>Para aceptar la invitación, haz clic en el siguiente botón:</p>
        
        <p style="text-align: center; margin: 30px 0;">
          <a href="${invitationUrl}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Unirme al hogar
          </a>
        </p>
        
        <p>O si ya tienes una cuenta, puedes ingresar este código de invitación:</p>
        
        <div style="background-color: #f3f4f6; padding: 15px; text-align: center; margin: 20px 0; font-size: 20px; font-weight: bold; letter-spacing: 2px;">
          ${params.invitationCode}
        </div>
        
        <p>¡Gracias!<br>
        El equipo de Nido Financiero</p>
      </div>
      <div style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280;">
        &copy; ${new Date().getFullYear()} Nido Financiero. Todos los derechos reservados.
      </div>
    </div>
  `;
  
  return sendEmail({
    to: params.to,
    subject,
    text,
    html,
  });
}