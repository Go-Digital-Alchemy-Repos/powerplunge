# Architecture Overview

Power Plunge uses a modern full-stack architecture built on React, Express, and PostgreSQL.

## Frontend

- **Framework:** React with Vite
- **Routing:** Wouter
- **Styling:** Tailwind CSS with shadcn/ui components
- **State:** React Query for server state management
- **Theme:** Dark theme with icy blue accents (#67e8f9)

## Backend

- **Framework:** Express.js with TypeScript
- **ORM:** Drizzle ORM
- **Database:** PostgreSQL (local Postgres for development; Neon Postgres for deployed and explicit ops environments)
- **Architecture:** Layered modular design with dedicated routes, services, middleware, and integrations

## Key Modules

- `server/routes.ts` — Main route registration
- `server/src/routes/` — Modular route files (admin, customer, public)
- `server/src/services/` — Business logic services
- `server/src/middleware/` — Auth, logging, error handling
- `server/src/integrations/` — External service integrations (Stripe, Mailgun)
