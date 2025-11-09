import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler, Request, Response, NextFunction } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

const getOidcConfig = memoize(
  async () => {
    try {
      return await client.discovery(
        new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
        process.env.REPL_ID!
      );
    } catch (error) {
      console.error("Failed to load OAuth config:", error);
      throw error;
    }
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
    },
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
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  // Check for required environment variables
  if (!process.env.REPL_ID || !process.env.ISSUER_URL || !process.env.SESSION_SECRET || !process.env.DATABASE_URL) {
    console.warn("OAuth not configured - required env vars missing. Login will not work.");
    // Install stub middleware so req.isAuthenticated exists
    app.use((req: any, res, next) => {
      req.isAuthenticated = () => false;
      req.user = undefined;
      req.oauthDisabled = true;
      next();
    });
    // Register stub handlers that return 503
    app.get("/api/login", (req, res) => res.status(503).json({ error: "OAuth not configured in development" }));
    app.get("/api/logout", (req, res) => res.status(503).json({ error: "OAuth not configured in development" }));
    app.get("/api/callback", (req, res) => res.status(503).json({ error: "OAuth not configured in development" }));
    return; // Skip OAuth setup
  }

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

  // Keep track of registered strategies
  const registeredStrategies = new Set<string>();

  // Helper function to ensure strategy exists for a request
  const ensureStrategy = (req: Request) => {
    const domain = req.hostname;
    const strategyName = `replitauth:${domain}`;
    if (!registeredStrategies.has(strategyName)) {
      const callbackURL = `${req.protocol}://${req.get('host')}/api/callback`;
      const strategy = new Strategy(
        {
          name: strategyName,
          config,
          scope: "openid email profile offline_access",
          callbackURL,
        },
        verify,
      );
      passport.use(strategy);
      registeredStrategies.add(strategyName);
    }
  };

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    try {
      ensureStrategy(req);
      passport.authenticate(`replitauth:${req.hostname}`, {
        prompt: "login consent",
        scope: ["openid", "email", "profile", "offline_access"],
      })(req, res, next);
    } catch (error) {
      console.error("Login authentication error:", error);
      res.status(500).json({ error: "Authentication failed" });
    }
  });

  app.get("/api/callback", (req, res, next) => {
    try {
      ensureStrategy(req);
      passport.authenticate(`replitauth:${req.hostname}`, {
        successReturnToOrRedirect: "/",
        failureRedirect: "/api/login",
      })(req, res, next);
    } catch (error) {
      console.error("Callback authentication error:", error);
      res.status(500).json({ error: "Authentication callback failed" });
    }
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  // Check if OAuth is disabled (stub mode) using the flag we set
  if ((req as any).oauthDisabled) {
    return res.status(503).json({ error: "Authentication not configured" });
  }

  if (!req.isAuthenticated) {
    // Passport not initialized (OAuth disabled)
    return res.status(503).json({ error: "Authentication not configured" });
  }
  
  if (req.isAuthenticated()) {
    return next();
  }
  
  return res.status(401).json({ error: "Unauthorized" });
};
