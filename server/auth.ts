import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual, createHash } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser, insertUserSchema } from "@shared/schema";
import { z } from "zod";
import { validateInvitationCode, consumeInvitationCode } from "./invitation";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}



export function setupAuth(app: Express) {
  // Configuración específica para Replit
  const isProduction = process.env.NODE_ENV === 'production';
  // En Replit, las cookies seguras funcionan incluso en desarrollo
  const isSecure = !!process.env.REPLIT_DOMAINS || isProduction;
  // No necesitamos especificar un dominio para las cookies en el entorno Replit
  // ya que este se maneja automáticamente
  
  console.log('Configuración de sesión:');
  console.log('- Entorno:', process.env.NODE_ENV);
  console.log('- Dominio Replit:', process.env.REPLIT_DOMAINS || 'No configurado');
  console.log('- Cookie secure:', isSecure);
  
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "mi-hogar-financiero-secreto",
    name: 'nido.sid', // Nombre personalizado de la cookie para evitar el estándar de 'connect.sid'
    resave: true, // Importante para mantener la sesión activa
    saveUninitialized: false, // No guardar sesiones vacías
    store: storage.sessionStore,
    cookie: {
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
      secure: isSecure,
      httpOnly: true,
      sameSite: isSecure ? "none" : "lax"
      // No configurar domain, dejar que el navegador lo maneje automáticamente
    },
    rolling: true, // Renovar la cookie en cada petición
    proxy: true // Indicar que estamos detrás de un proxy (Replit)
  };

  // Configuración para trabajar con el proxy de Replit
  app.set("trust proxy", 1);
  
  // Debug para el error "connect.sid" cookie
  app.use((req, res, next) => {
    // Log completo para ayudar en debug
    if (req.path === '/api/login' || req.path === '/api/register' || req.path === '/api/user') {
      console.log(`Cookies en la solicitud ${req.path}:`, req.headers.cookie || 'No hay cookies');
    }
    next();
  });
  
  // Aplicar middleware de sesión
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        // Comprobar si el usuario intentó iniciar sesión con un correo electrónico
        const isEmail = username.includes('@');
        
        // Buscar usuario por nombre de usuario o correo electrónico
        let user;
        if (isEmail) {
          user = await storage.getUserByEmail(username);
        } else {
          user = await storage.getUserByUsername(username);
        }
        
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false, { message: "Usuario o contraseña incorrectos" });
        } else {
          return done(null, user);
        }
      } catch (err) {
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const registrationData = await insertUserSchema.parseAsync(req.body);
      
      // Verificar si el nombre de usuario ya existe
      const existingUsername = await storage.getUserByUsername(registrationData.username);
      if (existingUsername) {
        return res.status(400).json({ message: "El nombre de usuario ya existe" });
      }
      
      // Verificar si el email ya existe
      const existingEmail = await storage.getUserByEmail(registrationData.email);
      if (existingEmail) {
        return res.status(400).json({ message: "El correo electrónico ya está registrado" });
      }

      // Extraer el código de invitación si existe
      const invitationCode = registrationData.invitationCode;
      
      // Crear una copia sin el código de invitación para la base de datos
      // (ya que invitationCode no es parte del schema de la tabla users)
      const { invitationCode: _, ...userDataForDB } = registrationData;

      // Crear el usuario
      const user = await storage.createUser({
        ...userDataForDB,
        password: await hashPassword(userDataForDB.password),
      });

      // Create default settings for the user
      await storage.createSettings({
        userId: user.id,
        defaultCurrency: "UYU",
        theme: "light",
        language: "es",
        exchangeRate: "40.0",
      });

      // Procesar el código de invitación si existe
      let invitationResult = null;
      if (invitationCode) {
        try {
          // Validar el código
          const validation = validateInvitationCode(invitationCode);
          if (validation.valid && validation.userId) {
            // Guardar los datos de la invitación para procesar después de login
            invitationResult = {
              valid: true,
              inviterUserId: validation.userId,
              householdId: validation.householdId
            };
            
            // Consume el código
            consumeInvitationCode(invitationCode);
          }
        } catch (invitationError) {
          console.error("Error al procesar invitación:", invitationError);
          // Continuamos con el registro aunque falle la invitación
        }
      }

      req.login(user, async (err) => {
        if (err) return next(err);
        
        // Procesar la invitación después del login si es válida
        if (invitationResult && invitationResult.valid) {
          try {
            // Agregar al usuario a la familia del invitador
            await storage.createFamilyMember({
              userId: invitationResult.inviterUserId, // ID del usuario que invita
              name: user.name,
              email: user.email,
              relationship: "Familiar",
              isActive: true,
              canAccess: true
            });

            // También agregar un registro para el usuario invitado
            await storage.createFamilyMember({
              userId: user.id, // ID del nuevo usuario
              name: user.name,
              email: user.email,
              relationship: "Familiar",
              isActive: true,
              canAccess: true
            });
            
            // Si hay un ID de hogar, establecer el hogar del usuario
            if (invitationResult.householdId) {
              await storage.updateUser(user.id, {
                householdId: invitationResult.householdId
              });
            }
          } catch (familyError) {
            console.error("Error al agregar usuario a la familia:", familyError);
            // Continuamos aunque falle
          }
        }
        
        // Remove sensitive information and crear result object
        const userResponse = { ...user } as any;
        userResponse.password = undefined;
        
        // Incluir información sobre la invitación en la respuesta
        if (invitationResult && invitationResult.valid) {
          userResponse.invitationAccepted = true;
        }
        
        res.status(201).json(userResponse);
      });
    } catch (error) {
      res.status(400).json({ message: "Datos de registro inválidos", error });
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: Error | null, user: SelectUser | false, info: { message?: string } | undefined) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Credenciales inválidas" });
      
      req.login(user, (loginErr: Error | null) => {
        if (loginErr) return next(loginErr);
        // Remove sensitive information
        const userResponse = { ...user } as any;
        if (userResponse.password) {
          userResponse.password = undefined;
        }
        res.status(200).json(userResponse);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    // Verificar si el usuario está autenticado
    if (req.isAuthenticated()) {
      console.log("Cerrando sesión de usuario:", req.user?.id);
    }
    
    // Lógica para Replit: Necesitamos asegurarnos de que las cookies se limpien correctamente
    const isProduction = process.env.NODE_ENV === 'production';
    const isSecure = process.env.REPLIT_DOMAINS ? true : isProduction;
    const domain = process.env.REPLIT_DOMAINS ? process.env.REPLIT_DOMAINS.split(',')[0] : undefined;
    
    req.logout((err) => {
      if (err) return next(err);
      
      req.session.destroy((sessionErr) => {
        if (sessionErr) {
          console.error("Error al destruir la sesión:", sessionErr);
        }
        
        // Limpiar la cookie con las mismas opciones con las que se creó
        res.clearCookie('nido.sid', {
          path: '/',
          httpOnly: true,
          secure: isSecure,
          sameSite: isSecure ? "none" : "lax"
          // No especificar domain para que funcione correctamente
        });
        
        res.status(200).json({ success: true, message: "Sesión cerrada con éxito" });
      });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    // Remove sensitive information
    const userResponse = { ...req.user } as any;
    if (userResponse.password) {
      userResponse.password = undefined;
    }
    res.json(userResponse);
  });

  // Esquema para validar la solicitud de restablecimiento de contraseña
  const forgotPasswordSchema = z.object({
    email: z.string().email("Ingrese un correo electrónico válido"),
  });

  // Esquema para validar el restablecimiento de contraseña
  const resetPasswordSchema = z.object({
    token: z.string().min(1, "El token es necesario"),
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  });

  // Mapa para almacenar los tokens de restablecimiento (en producción usaríamos una base de datos)
  const resetTokens = new Map<string, { userId: number, expires: Date }>();

  // Solicitar restablecimiento de contraseña
  app.post("/api/forgot-password", async (req, res) => {
    try {
      const { email } = await forgotPasswordSchema.parseAsync(req.body);
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        // Por seguridad, no revelar si el email existe o no
        return res.status(200).json({ 
          message: "Si el correo electrónico está registrado, recibirás instrucciones para restablecer tu contraseña." 
        });
      }

      // Generar token único
      const token = createHash('sha256')
        .update(randomBytes(32).toString('hex') + user.id + Date.now())
        .digest('hex');
      
      // Establecer expiración (1 hora)
      const expires = new Date();
      expires.setHours(expires.getHours() + 1);
      
      // Guardar token
      resetTokens.set(token, { userId: user.id, expires });

      // Enviar correo electrónico con el token
      try {
        const { sendPasswordResetEmail } = await import('./email-service');
        await sendPasswordResetEmail({
          to: email,
          token,
          username: user.username,
        });
        
        res.status(200).json({ 
          message: "Si el correo electrónico está registrado, recibirás instrucciones para restablecer tu contraseña."
        });
      } catch (emailError) {
        console.error('Error al enviar correo de recuperación:', emailError);
        // Aunque falló el envío, por seguridad mantenemos el mismo mensaje
        res.status(200).json({ 
          message: "Si el correo electrónico está registrado, recibirás instrucciones para restablecer tu contraseña.",
          // Solo para desarrollo - Eliminar en producción si no está en modo debug
          token: process.env.NODE_ENV === 'development' ? token : undefined
        });
      }
    } catch (error) {
      res.status(400).json({ message: "Error en la solicitud", error });
    }
  });

  // Restablecer contraseña con token
  app.post("/api/reset-password", async (req, res) => {
    try {
      const { token, password } = await resetPasswordSchema.parseAsync(req.body);
      
      // Verificar si el token existe y es válido
      const resetInfo = resetTokens.get(token);
      if (!resetInfo) {
        return res.status(400).json({ message: "Token inválido o expirado" });
      }
      
      // Verificar si el token ha expirado
      if (new Date() > resetInfo.expires) {
        resetTokens.delete(token);
        return res.status(400).json({ message: "El token ha expirado" });
      }
      
      // Actualizar la contraseña del usuario
      const hashedPassword = await hashPassword(password);
      await storage.updateUser(resetInfo.userId, { password: hashedPassword });
      
      // Eliminar el token usado
      resetTokens.delete(token);
      
      res.status(200).json({ message: "Contraseña actualizada con éxito" });
    } catch (error) {
      res.status(400).json({ message: "Error al restablecer la contraseña", error });
    }
  });
  
}
