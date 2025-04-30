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
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "mi-hogar-financiero-secreto",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      secure: false, // Deshabilitamos secure para desarrollo
      httpOnly: true,
      sameSite: "lax"
    }
  };

  app.set("trust proxy", 1);
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

      // Extraer el código de invitación si existe (como puede estar en registrationData como propiedad adicional)
      const invitationCode = (registrationData as any).invitationCode;
      // Crear una copia sin el código de invitación
      const { invitationCode: _, ...registrationDataWithoutCode } = { ...(registrationData as any) };

      // Crear el usuario
      const user = await storage.createUser({
        ...registrationDataWithoutCode,
        password: await hashPassword(registrationData.password),
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
          // Importar desde invitación para validar el código
          const { validateInvitationCode, consumeInvitationCode } = require('./invitation');
          
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
            // Agregar al usuario a la familia
            // Usamos 'as any' para evitar errores de tipo ya que el schema puede haber cambiado
            await storage.createFamilyMember({
              userId: invitationResult.inviterUserId,
              familyMemberId: user.id,
              name: user.name,
              relationship: "Familiar", // Usar el campo correcto según el esquema
              isActive: true
            } as any);
            
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
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
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
