import type { Express, RequestHandler } from "express";
import session from "express-session";

const DEV_USER = {
  id: "local-dev-user",
  email: "dev@localhost",
  firstName: "Dev",
  lastName: "User",
  profileImageUrl: null,
};

export function setupLocalDevAuth(app: Express): void {
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "local-dev-secret",
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false, httpOnly: true, sameSite: "lax" },
    })
  );

  app.get("/api/login", (_req, res) => {
    ((_req as any).session as any).user = DEV_USER;
    res.redirect("/");
  });

  app.get("/api/callback", (_req, res) => {
    res.redirect("/");
  });

  app.get("/api/logout", (req, res) => {
    req.session.destroy(() => {
      res.redirect("/");
    });
  });

  app.get("/api/auth/user", (req, res) => {
    const user = (req.session as any)?.user;
    if (user) {
      res.json(user);
    } else {
      res.status(401).json({ message: "Not authenticated (dev mode)" });
    }
  });

  console.log(
    "[AUTH] Dev auth stub active: /api/login auto-logs in as dev user"
  );
}

export function setupAuthDisabledRoutes(app: Express): void {
  app.get("/api/login", (_req, res) => {
    res.status(503).json({
      message:
        "Auth not configured. Set ENABLE_DEV_AUTH=true for local dev auth, or run on Replit for OIDC auth.",
    });
  });

  app.get("/api/callback", (_req, res) => {
    res.status(503).json({ message: "Auth not configured." });
  });

  app.get("/api/logout", (_req, res) => {
    res.status(503).json({ message: "Auth not configured." });
  });

  app.get("/api/auth/user", (_req, res) => {
    res.status(401).json({ message: "Auth not configured." });
  });

  console.warn(
    "[AUTH] Replit OIDC auth disabled (no REPL_ID). Auth routes return 503. Set ENABLE_DEV_AUTH=true for a local dev stub."
  );
}
