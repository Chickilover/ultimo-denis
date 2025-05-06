import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { db } from "./db";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  console.log("No se proporcionó REPLIT_DOMAINS, se omite la configuración de Replit Auth");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 semana
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  return session({
    secret: process.env.SESSION_SECRET || "mi-hogar-financiero-secreto",
    name: 'nido.sid',
    store: sessionStore,
    resave: true,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true, // Always use secure cookies in Replit
      maxAge: sessionTtl,
      sameSite: 'none' // Use 'none' for cross-site requests in Replit
    },
    rolling: true,
    proxy: true
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  const userId = claims["sub"];
  const username = claims["username"];
  const email = claims["email"];
  
  // Buscar si el usuario ya existe en el sistema
  const existingUser = await storage.getUserByUsername(username);
  
  if (existingUser) {
    // Actualizar el usuario existente con los datos de Replit
    console.log(`Usuario Replit existente: ${username}`);
    return existingUser;
  } else {
    // Crear un nuevo usuario basado en los datos de Replit
    console.log(`Creando nuevo usuario Replit: ${username}`);
    
    const newUser = await storage.createUser({
      id: parseInt(userId),
      username: username,
      email: email || `${username}@replit.user`,
      password: "", // No se necesita contraseña para auth de Replit
      name: claims["first_name"] || username,
      avatar: claims["profile_image_url"] || null,
      personalBalance: "0",
      familyBalance: "0",
      createdAt: new Date()
    });
    
    // Crear configuración por defecto para el nuevo usuario
    await storage.createSettings({
      userId: newUser.id,
      defaultCurrency: "UYU",
      theme: "light",
      language: "es",
      exchangeRate: "40.0",
    });
    
    return newUser;
  }
}

export async function setupReplitAuth(app: Express) {
  if (!process.env.REPLIT_DOMAINS) {
    console.log("Replit Auth no configurado (no se proporcionó REPLIT_DOMAINS)");
    return;
  }
  
  console.log("Configurando Replit Auth para dominios:", process.env.REPLIT_DOMAINS);
  
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/replit-logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
  
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUserByUsername(req.user.claims.username);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // Si no estamos usando Replit Auth, seguir con la autenticación estándar
  if (!process.env.REPLIT_DOMAINS) {
    return next();
  }
  
  const user = req.user as any;

  if (!req.isAuthenticated() || !user?.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    return res.redirect("/api/login");
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    return res.redirect("/api/login");
  }
};