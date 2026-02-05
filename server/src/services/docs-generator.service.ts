/**
 * Documentation Generator Service
 * Scans the codebase to generate comprehensive system documentation
 * READ-ONLY scanning - does not modify any files except Docs Library entries
 */

import { storage } from "../../storage";
import fs from "fs";
import path from "path";

interface RouteInfo {
  method: string;
  path: string;
  auth: "public" | "customer" | "admin";
  description?: string;
}

interface EnvVarInfo {
  name: string;
  required: boolean;
  description?: string;
  category: string;
}

interface TableInfo {
  name: string;
  description?: string;
  fields: string[];
}

interface IntegrationInfo {
  name: string;
  description: string;
  envVars: string[];
}

interface SystemSnapshot {
  routes: RouteInfo[];
  envVars: EnvVarInfo[];
  tables: TableInfo[];
  integrations: IntegrationInfo[];
  generatedAt: string;
}

class DocsGeneratorService {
  /**
   * Scan routes from the codebase
   */
  private async scanRoutes(): Promise<RouteInfo[]> {
    const routes: RouteInfo[] = [];
    
    // Read main routes file
    const routesPath = path.join(process.cwd(), "server/routes.ts");
    if (fs.existsSync(routesPath)) {
      const content = fs.readFileSync(routesPath, "utf-8");
      
      // Match app.get/post/patch/put/delete patterns
      const routePattern = /app\.(get|post|patch|put|delete)\s*\(\s*["'`]([^"'`]+)["'`]/gi;
      let match;
      
      while ((match = routePattern.exec(content)) !== null) {
        const method = match[1].toUpperCase();
        const routePath = match[2];
        
        // Determine auth level based on path and surrounding context
        let auth: "public" | "customer" | "admin" = "public";
        if (routePath.includes("/admin/")) {
          auth = "admin";
        } else if (routePath.includes("/customer/")) {
          auth = "customer";
        }
        
        routes.push({ method, path: routePath, auth });
      }
    }
    
    // Also scan modular route files
    const routeDirs = [
      "server/src/routes/public",
      "server/src/routes/admin",
      "server/src/routes/customer",
    ];
    
    for (const dir of routeDirs) {
      const fullPath = path.join(process.cwd(), dir);
      if (fs.existsSync(fullPath)) {
        const files = fs.readdirSync(fullPath).filter(f => f.endsWith(".ts"));
        for (const file of files) {
          const content = fs.readFileSync(path.join(fullPath, file), "utf-8");
          const routePattern = /router\.(get|post|patch|put|delete)\s*\(\s*["'`]([^"'`]+)["'`]/gi;
          let match;
          
          while ((match = routePattern.exec(content)) !== null) {
            const method = match[1].toUpperCase();
            const routePath = match[2];
            
            let auth: "public" | "customer" | "admin" = "public";
            if (dir.includes("admin")) auth = "admin";
            else if (dir.includes("customer")) auth = "customer";
            
            routes.push({ method, path: routePath, auth });
          }
        }
      }
    }
    
    return routes;
  }

  /**
   * Scan environment variables from the codebase
   */
  private async scanEnvVars(): Promise<EnvVarInfo[]> {
    const envVars: Map<string, EnvVarInfo> = new Map();
    
    // Known env vars with descriptions
    const knownEnvVars: Record<string, { required: boolean; description: string; category: string }> = {
      "DATABASE_URL": { required: true, description: "PostgreSQL database connection string", category: "Database" },
      "PGHOST": { required: false, description: "PostgreSQL host", category: "Database" },
      "PGPORT": { required: false, description: "PostgreSQL port", category: "Database" },
      "PGUSER": { required: false, description: "PostgreSQL user", category: "Database" },
      "PGPASSWORD": { required: false, description: "PostgreSQL password", category: "Database" },
      "PGDATABASE": { required: false, description: "PostgreSQL database name", category: "Database" },
      "STRIPE_SECRET_KEY": { required: true, description: "Stripe API secret key for payments", category: "Stripe" },
      "STRIPE_PUBLISHABLE_KEY": { required: true, description: "Stripe publishable key for client-side", category: "Stripe" },
      "STRIPE_WEBHOOK_SECRET": { required: true, description: "Stripe webhook signing secret", category: "Stripe" },
      "MAILGUN_API_KEY": { required: false, description: "Mailgun API key for email sending", category: "Email" },
      "MAILGUN_DOMAIN": { required: false, description: "Mailgun domain for email sending", category: "Email" },
      "SENDGRID_API_KEY": { required: false, description: "SendGrid API key (alternative email)", category: "Email" },
      "SESSION_SECRET": { required: false, description: "Session encryption secret", category: "Security" },
      "REPLIT_DOMAINS": { required: false, description: "Replit deployment domains", category: "Replit" },
      "REPL_ID": { required: false, description: "Replit instance ID", category: "Replit" },
      "REPLIT_DB_URL": { required: false, description: "Replit database URL", category: "Replit" },
      "NODE_ENV": { required: false, description: "Node environment (development/production)", category: "System" },
      "PORT": { required: false, description: "Server port (default: 5000)", category: "System" },
    };
    
    // Add known env vars
    for (const [name, info] of Object.entries(knownEnvVars)) {
      envVars.set(name, { name, ...info });
    }
    
    // Scan server files for process.env usage
    const serverPath = path.join(process.cwd(), "server");
    if (fs.existsSync(serverPath)) {
      const scanDir = (dir: string) => {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        for (const item of items) {
          if (item.isDirectory() && !item.name.includes("node_modules")) {
            scanDir(path.join(dir, item.name));
          } else if (item.isFile() && item.name.endsWith(".ts")) {
            const content = fs.readFileSync(path.join(dir, item.name), "utf-8");
            const envPattern = /process\.env\.([A-Z_][A-Z0-9_]*)/g;
            let match;
            while ((match = envPattern.exec(content)) !== null) {
              const name = match[1];
              if (!envVars.has(name)) {
                envVars.set(name, { name, required: false, category: "Other", description: "Auto-detected environment variable" });
              }
            }
          }
        }
      };
      scanDir(serverPath);
    }
    
    return Array.from(envVars.values());
  }

  /**
   * Scan database schema for tables
   */
  private async scanSchema(): Promise<TableInfo[]> {
    const tables: TableInfo[] = [];
    
    const schemaPath = path.join(process.cwd(), "shared/schema.ts");
    if (fs.existsSync(schemaPath)) {
      const content = fs.readFileSync(schemaPath, "utf-8");
      
      // Match pgTable definitions
      const tablePattern = /export const (\w+) = pgTable\s*\(\s*["'`]([^"'`]+)["'`]/g;
      let match;
      
      while ((match = tablePattern.exec(content)) !== null) {
        const varName = match[1];
        const tableName = match[2];
        
        // Try to extract field names from the table definition
        const fields: string[] = [];
        const tableStart = match.index;
        const tableContent = content.slice(tableStart, tableStart + 2000);
        const fieldPattern = /(\w+):\s*(varchar|text|integer|boolean|timestamp|jsonb|serial)/g;
        let fieldMatch;
        while ((fieldMatch = fieldPattern.exec(tableContent)) !== null) {
          fields.push(fieldMatch[1]);
        }
        
        tables.push({ name: tableName, fields, description: `${varName} entity` });
      }
    }
    
    return tables;
  }

  /**
   * Scan for integrations
   */
  private async scanIntegrations(): Promise<IntegrationInfo[]> {
    const integrations: IntegrationInfo[] = [];
    
    // Stripe integration
    const stripePath = path.join(process.cwd(), "server/src/integrations/stripe");
    if (fs.existsSync(stripePath)) {
      integrations.push({
        name: "Stripe",
        description: "Payment processing integration for checkout and subscriptions",
        envVars: ["STRIPE_SECRET_KEY", "STRIPE_PUBLISHABLE_KEY", "STRIPE_WEBHOOK_SECRET"],
      });
    }
    
    // Mailgun integration
    const mailgunPath = path.join(process.cwd(), "server/src/integrations/mailgun");
    if (fs.existsSync(mailgunPath)) {
      integrations.push({
        name: "Mailgun",
        description: "Email service integration for transactional emails",
        envVars: ["MAILGUN_API_KEY", "MAILGUN_DOMAIN"],
      });
    }
    
    // Replit Auth
    const replitAuthPath = path.join(process.cwd(), "server/src/integrations/replit/auth");
    if (fs.existsSync(replitAuthPath)) {
      integrations.push({
        name: "Replit Auth",
        description: "Authentication integration using Replit OpenID Connect",
        envVars: ["REPLIT_DOMAINS", "SESSION_SECRET"],
      });
    }
    
    // Object Storage
    const objectStoragePath = path.join(process.cwd(), "server/src/integrations/replit/object-storage");
    if (fs.existsSync(objectStoragePath)) {
      integrations.push({
        name: "Replit Object Storage",
        description: "File storage integration for product images and uploads",
        envVars: [],
      });
    }
    
    return integrations;
  }

  /**
   * Generate full system snapshot
   */
  async generateSnapshot(): Promise<SystemSnapshot> {
    const [routes, envVars, tables, integrations] = await Promise.all([
      this.scanRoutes(),
      this.scanEnvVars(),
      this.scanSchema(),
      this.scanIntegrations(),
    ]);
    
    return {
      routes,
      envVars,
      tables,
      integrations,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generate Architecture Overview doc content
   */
  private generateArchitectureDoc(snapshot: SystemSnapshot): string {
    return `# Power Plunge Platform Architecture

*Auto-generated on ${new Date().toLocaleString()} | System Version 2.0*

---

## Executive Summary

Power Plunge is a comprehensive e-commerce platform designed specifically for selling premium cold plunge tanks. The platform combines a high-converting storefront with powerful admin tools for order management, customer relationships, affiliate marketing, and revenue optimization.

---

## Technology Stack

### Frontend Layer
| Technology | Purpose | Version |
|-----------|---------|---------|
| **React** | UI component library | 18.x |
| **Vite** | Build tool & dev server | 5.x |
| **TailwindCSS** | Utility-first styling | 3.x |
| **shadcn/ui** | Pre-built component library | Latest |
| **Wouter** | Lightweight routing | Latest |
| **TanStack Query** | Server state management | 5.x |

### Backend Layer
| Technology | Purpose |
|-----------|---------|
| **Node.js + Express** | API server (TypeScript) |
| **Drizzle ORM** | Type-safe database queries |
| **PostgreSQL** | Primary data store |
| **Zod** | Request/response validation |

### External Services
| Service | Integration Purpose |
|---------|---------------------|
| **Stripe** | Payment processing, webhooks |
| **Mailgun** | Transactional email delivery |
| **Replit Auth** | Customer authentication (OIDC) |
| **Replit Object Storage** | Product images, file uploads |

---

## System Architecture Diagram

\`\`\`
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React/Vite)                     │
├─────────────────────┬────────────────────┬──────────────────────┤
│   Customer Portal   │   Admin Dashboard   │   Affiliate Portal   │
│   - Homepage        │   - Orders          │   - Commission View  │
│   - Product Pages   │   - Products        │   - Referral Links   │
│   - Checkout        │   - Customers       │   - Payout History   │
│   - My Account      │   - Settings        │                      │
└─────────────────────┴────────────────────┴──────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API LAYER (Express)                         │
├──────────────┬──────────────┬──────────────┬────────────────────┤
│  Public API  │ Customer API │  Admin API   │  Webhook Handlers  │
│  /api/*      │ /api/cust/*  │ /api/admin/* │  /api/webhook/*    │
└──────────────┴──────────────┴──────────────┴────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SERVICE LAYER                               │
├───────────────┬───────────────┬───────────────┬─────────────────┤
│ Order Service │ Email Service │ Affiliate Svc │ Revenue Guard   │
│ Checkout Svc  │ Payment Svc   │ Coupon Svc    │ Docs Generator  │
└───────────────┴───────────────┴───────────────┴─────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 DATA LAYER (Drizzle ORM)                         │
│                     PostgreSQL Database                          │
│    ${snapshot.tables.length} Tables | ${snapshot.routes.length} API Endpoints | ${snapshot.integrations.length} Integrations    │
└─────────────────────────────────────────────────────────────────┘
\`\`\`

---

## Project Directory Structure

\`\`\`
power-plunge/
├── client/                      # React frontend application
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   │   ├── ui/              # shadcn/ui base components
│   │   │   ├── AdminNav.tsx     # Admin navigation bar
│   │   │   ├── CartUpsells.tsx  # Upsell components
│   │   │   └── ...
│   │   ├── pages/               # Route page components
│   │   │   ├── home.tsx         # Main storefront
│   │   │   ├── checkout.tsx     # Checkout flow
│   │   │   ├── admin-*.tsx      # Admin pages
│   │   │   └── ...
│   │   ├── hooks/               # Custom React hooks
│   │   └── lib/                 # Utility functions
│   └── index.html               # Entry point
│
├── server/                      # Express backend
│   ├── src/
│   │   ├── routes/              # Modular route handlers
│   │   │   ├── admin/           # Admin-only endpoints
│   │   │   ├── customer/        # Authenticated customer endpoints
│   │   │   └── public/          # Public endpoints
│   │   ├── services/            # Business logic services
│   │   ├── integrations/        # External API wrappers
│   │   │   ├── stripe/          # Payment processing
│   │   │   ├── mailgun/         # Email service
│   │   │   └── replit/          # Auth & storage
│   │   ├── middleware/          # Express middleware
│   │   └── config/              # Configuration modules
│   ├── routes.ts                # Main route definitions
│   └── storage.ts               # Data access layer
│
├── shared/                      # Shared TypeScript code
│   └── schema.ts                # Drizzle database schema
│
└── docs/                        # Static documentation
\`\`\`

---

## Security Architecture

### Authentication Layers

| Layer | Method | Scope |
|-------|--------|-------|
| **Public** | None | Product browsing, basic info |
| **Customer** | Replit Auth (OIDC) | Order history, account management |
| **Admin** | Email/Password + Session | Full system access |

### Security Measures

- **Session Management**: Secure HTTP-only cookies with configurable expiration
- **CSRF Protection**: Token-based validation on mutations
- **Input Validation**: Zod schemas on all API endpoints
- **SQL Injection**: Prevented via Drizzle ORM parameterization
- **XSS Prevention**: React's built-in escaping + CSP headers

---

## Performance Considerations

- **Database Connection Pooling**: Configured for optimal concurrent requests
- **API Response Caching**: TanStack Query handles client-side caching
- **Image Optimization**: Object Storage with CDN delivery
- **Code Splitting**: Vite's automatic chunk optimization

---

## Key Metrics

| Metric | Value |
|--------|-------|
| Total API Endpoints | ${snapshot.routes.length} |
| Database Tables | ${snapshot.tables.length} |
| Active Integrations | ${snapshot.integrations.length} |
| Environment Variables | ${snapshot.envVars.length} |

---

## Manual Notes

*Add architectural decisions, diagrams, or implementation notes below. This section is preserved during regeneration.*

`;
  }

  /**
   * Generate API Reference doc content
   */
  private generateApiReferenceDoc(snapshot: SystemSnapshot): string {
    const publicRoutes = snapshot.routes.filter(r => r.auth === "public");
    const customerRoutes = snapshot.routes.filter(r => r.auth === "customer");
    const adminRoutes = snapshot.routes.filter(r => r.auth === "admin");
    
    const formatRoute = (r: RouteInfo) => `| \`${r.method}\` | \`${r.path}\` |`;
    
    // Group admin routes by category
    const orderRoutes = adminRoutes.filter(r => r.path.includes("order"));
    const productRoutes = adminRoutes.filter(r => r.path.includes("product"));
    const customerAdminRoutes = adminRoutes.filter(r => r.path.includes("customer"));
    const affiliateRoutes = adminRoutes.filter(r => r.path.includes("affiliate"));
    const settingsRoutes = adminRoutes.filter(r => r.path.includes("settings") || r.path.includes("config"));
    const docsRoutes = adminRoutes.filter(r => r.path.includes("docs"));
    const otherAdminRoutes = adminRoutes.filter(r => 
      !r.path.includes("order") && !r.path.includes("product") && 
      !r.path.includes("customer") && !r.path.includes("affiliate") &&
      !r.path.includes("settings") && !r.path.includes("config") && !r.path.includes("docs")
    );
    
    return `# API Reference

*Auto-generated on ${new Date().toLocaleString()}*

---

## Overview

This document provides a complete reference for all Power Plunge API endpoints. The API follows RESTful conventions and uses JSON for request/response bodies.

### Authentication

| Level | Description | Header Required |
|-------|-------------|-----------------|
| **Public** | No authentication needed | None |
| **Customer** | Requires valid customer session | Cookie-based session |
| **Admin** | Requires admin credentials | Cookie-based session |

### Response Format

All API responses follow this structure:

\`\`\`json
{
  "success": true,
  "data": { ... },
  "error": null
}
\`\`\`

Error responses:
\`\`\`json
{
  "success": false,
  "data": null,
  "error": { "message": "Error description", "code": "ERROR_CODE" }
}
\`\`\`

---

## Endpoint Statistics

| Category | Count |
|----------|-------|
| **Total Endpoints** | ${snapshot.routes.length} |
| Public | ${publicRoutes.length} |
| Customer | ${customerRoutes.length} |
| Admin | ${adminRoutes.length} |

---

## Public Endpoints

*No authentication required. Available to all visitors.*

| Method | Endpoint |
|--------|----------|
${publicRoutes.map(formatRoute).join("\n")}

### Key Public Endpoints

| Endpoint | Purpose |
|----------|---------|
| \`GET /api/products\` | Fetch product catalog for storefront |
| \`POST /api/checkout\` | Process customer checkout |
| \`POST /api/create-payment-intent\` | Initialize Stripe payment |
| \`POST /api/webhook/stripe\` | Handle Stripe webhook events |

---

## Customer Endpoints

*Requires authenticated customer session via Replit Auth.*

| Method | Endpoint |
|--------|----------|
${customerRoutes.map(formatRoute).join("\n")}

### Key Customer Endpoints

| Endpoint | Purpose |
|----------|---------|
| \`GET /api/customer/profile\` | Get customer profile and VIP status |
| \`GET /api/customer/orders\` | List customer's order history |
| \`GET /api/customer/affiliate\` | View affiliate dashboard (if enrolled) |
| \`POST /api/customer/affiliate/apply\` | Apply for affiliate program |

---

## Admin Endpoints

*Requires admin authentication with email/password.*

### Order Management (${orderRoutes.length} endpoints)
| Method | Endpoint |
|--------|----------|
${orderRoutes.map(formatRoute).join("\n")}

### Product Management (${productRoutes.length} endpoints)
| Method | Endpoint |
|--------|----------|
${productRoutes.map(formatRoute).join("\n")}

### Customer Management (${customerAdminRoutes.length} endpoints)
| Method | Endpoint |
|--------|----------|
${customerAdminRoutes.map(formatRoute).join("\n")}

### Affiliate Management (${affiliateRoutes.length} endpoints)
| Method | Endpoint |
|--------|----------|
${affiliateRoutes.map(formatRoute).join("\n")}

### Settings & Configuration (${settingsRoutes.length} endpoints)
| Method | Endpoint |
|--------|----------|
${settingsRoutes.map(formatRoute).join("\n")}

### Documentation (${docsRoutes.length} endpoints)
| Method | Endpoint |
|--------|----------|
${docsRoutes.map(formatRoute).join("\n")}

### Other Admin Endpoints (${otherAdminRoutes.length} endpoints)
| Method | Endpoint |
|--------|----------|
${otherAdminRoutes.map(formatRoute).join("\n")}

---

## Rate Limiting

- Standard endpoints: 100 requests/minute per IP
- Payment endpoints: 10 requests/minute per session
- Admin endpoints: No rate limit (authenticated only)

---

## Manual Notes

*Add detailed endpoint documentation, request/response examples, or usage notes below. This section is preserved during regeneration.*

`;
  }

  /**
   * Generate Data Model doc content
   */
  private generateDataModelDoc(snapshot: SystemSnapshot): string {
    // Group tables by domain
    const coreEntities = ["customers", "orders", "order_items", "products"];
    const affiliateEntities = ["affiliates", "affiliate_referrals", "affiliate_payouts"];
    const marketingEntities = ["coupons", "coupon_usages", "upsell_rules", "product_relationships"];
    const settingsEntities = ["admin_users", "site_settings", "email_templates", "vip_settings"];
    const trackingEntities = ["audit_logs", "email_events", "checkout_recovery_sessions", "revenue_guardrails"];
    const docsEntities = ["docs", "doc_versions"];
    
    const categorizeTable = (name: string) => {
      if (coreEntities.includes(name)) return "Core Business";
      if (affiliateEntities.includes(name)) return "Affiliate Program";
      if (marketingEntities.includes(name)) return "Marketing & Promotions";
      if (settingsEntities.includes(name)) return "Settings & Admin";
      if (trackingEntities.includes(name)) return "Analytics & Tracking";
      if (docsEntities.includes(name)) return "Documentation";
      return "Other";
    };
    
    const tablesByCategory: Record<string, TableInfo[]> = {};
    for (const table of snapshot.tables) {
      const category = categorizeTable(table.name);
      if (!tablesByCategory[category]) tablesByCategory[category] = [];
      tablesByCategory[category].push(table);
    }
    
    const categorySections = Object.entries(tablesByCategory)
      .sort(([a], [b]) => {
        const order = ["Core Business", "Affiliate Program", "Marketing & Promotions", "Settings & Admin", "Analytics & Tracking", "Documentation", "Other"];
        return order.indexOf(a) - order.indexOf(b);
      })
      .map(([category, tables]) => {
        const tableList = tables.map(t => `- **${t.name}** (${t.fields.length} fields)`).join("\n");
        return `### ${category}\n\n${tableList}`;
      }).join("\n\n");
    
    return `# Data Model Reference

*Auto-generated on ${new Date().toLocaleString()}*

---

## Overview

The Power Plunge platform uses PostgreSQL with Drizzle ORM for data persistence. The schema is defined in \`shared/schema.ts\` and uses type-safe TypeScript definitions.

### Quick Stats

| Metric | Value |
|--------|-------|
| Total Tables | ${snapshot.tables.length} |
| Core Entities | ${coreEntities.length} |
| Support Tables | ${snapshot.tables.length - coreEntities.length} |

---

## Entity Relationship Diagram

\`\`\`
┌─────────────────┐       ┌─────────────────┐
│    customers    │       │    products     │
│─────────────────│       │─────────────────│
│ id (PK)         │       │ id (PK)         │
│ email           │       │ name            │
│ firstName       │       │ price           │
│ lastName        │       │ description     │
│ vipTier         │       │ active          │
│ totalSpend      │       │ images[]        │
└────────┬────────┘       └────────┬────────┘
         │                         │
         │ 1:N                     │ 1:N
         ▼                         ▼
┌─────────────────┐       ┌─────────────────┐
│     orders      │◄──────│   order_items   │
│─────────────────│       │─────────────────│
│ id (PK)         │       │ id (PK)         │
│ customerId (FK) │       │ orderId (FK)    │
│ status          │       │ productId (FK)  │
│ total           │       │ quantity        │
│ createdAt       │       │ price           │
└─────────────────┘       └─────────────────┘
         │
         │ N:1 (optional)
         ▼
┌─────────────────┐       ┌─────────────────┐
│   affiliates    │◄──────│affiliate_referrals│
│─────────────────│       │─────────────────│
│ id (PK)         │       │ id (PK)         │
│ customerId (FK) │       │ affiliateId (FK)│
│ code            │       │ orderId (FK)    │
│ commissionRate  │       │ commission      │
│ status          │       │ status          │
└─────────────────┘       └─────────────────┘
\`\`\`

---

## Tables by Domain

${categorySections}

---

## Core Entities Detail

### customers
The central entity for all customer data.

| Column | Type | Description |
|--------|------|-------------|
| id | varchar (UUID) | Primary key |
| email | varchar | Unique email address |
| firstName | varchar | Customer first name |
| lastName | varchar | Customer last name |
| phone | varchar | Phone number (optional) |
| vipTier | varchar | VIP level (standard/silver/gold/platinum) |
| totalSpend | decimal | Lifetime spending total |
| orderCount | integer | Total number of orders |
| createdAt | timestamp | Account creation date |

### orders
Represents customer purchases.

| Column | Type | Description |
|--------|------|-------------|
| id | varchar (UUID) | Primary key |
| customerId | varchar (FK) | Reference to customers |
| status | varchar | pending/paid/shipped/delivered/cancelled |
| subtotal | decimal | Pre-tax/shipping amount |
| shipping | decimal | Shipping cost |
| tax | decimal | Tax amount |
| total | decimal | Final order total |
| shippingAddress | jsonb | Address object |
| affiliateCode | varchar | Referral code used (if any) |
| createdAt | timestamp | Order placement date |

### products
Product catalog entries.

| Column | Type | Description |
|--------|------|-------------|
| id | varchar (UUID) | Primary key |
| name | varchar | Product name |
| tagline | varchar | Short marketing tagline |
| description | text | Full product description |
| price | decimal | Base price |
| primaryImage | varchar | Main product image URL |
| secondaryImages | jsonb | Additional image URLs |
| features | jsonb | Feature list array |
| included | jsonb | What's included array |
| active | boolean | Is product visible |

---

## Affiliate Program Tables

### affiliates
Registered affiliate partners.

| Column | Type | Description |
|--------|------|-------------|
| id | varchar (UUID) | Primary key |
| customerId | varchar (FK) | Link to customer account |
| code | varchar | Unique referral code |
| commissionRate | decimal | Commission percentage |
| status | varchar | pending/active/suspended |
| paypalEmail | varchar | Payout destination |
| agreementSignedAt | timestamp | E-signature timestamp |

### affiliate_referrals
Tracks orders attributed to affiliates.

| Column | Type | Description |
|--------|------|-------------|
| id | varchar (UUID) | Primary key |
| affiliateId | varchar (FK) | Link to affiliate |
| orderId | varchar (FK) | The referred order |
| commission | decimal | Calculated commission |
| status | varchar | pending/approved/paid |

---

## Data Integrity

### Foreign Key Relationships

| Child Table | Column | References |
|-------------|--------|------------|
| orders | customerId | customers.id |
| order_items | orderId | orders.id |
| order_items | productId | products.id |
| affiliates | customerId | customers.id |
| affiliate_referrals | affiliateId | affiliates.id |
| affiliate_referrals | orderId | orders.id |

### Indexes

Key indexes for query performance:
- \`customers.email\` - unique index for login lookups
- \`orders.customerId\` - for customer order history
- \`orders.status\` - for order filtering
- \`affiliates.code\` - unique index for referral tracking
- \`products.active\` - for storefront queries

---

## Manual Notes

*Add schema migrations, ER diagrams, or additional data model notes below. This section is preserved during regeneration.*

`;
  }

  /**
   * Generate Environment Variables doc content
   */
  private generateEnvVarsDoc(snapshot: SystemSnapshot): string {
    const categoryOrder = ["Database", "Stripe", "Email", "Security", "Replit", "System", "Other"];
    const categories = [...new Set(snapshot.envVars.map(e => e.category))]
      .sort((a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b));
    
    const sections = categories.map(cat => {
      const vars = snapshot.envVars.filter(e => e.category === cat);
      const rows = vars.map(v => 
        `| \`${v.name}\` | ${v.required ? "**Yes**" : "No"} | ${v.description || "-"} |`
      ).join("\n");
      
      return `### ${cat}\n\n| Variable | Required | Description |\n|----------|----------|-------------|\n${rows}`;
    }).join("\n\n");
    
    const requiredVars = snapshot.envVars.filter(e => e.required);
    
    return `# Configuration & Environment Variables

*Auto-generated on ${new Date().toLocaleString()}*

---

## Overview

This document lists all environment variables used by the Power Plunge platform. Variables are automatically detected from the codebase and categorized by their purpose.

### Quick Stats

| Metric | Count |
|--------|-------|
| Total Variables | ${snapshot.envVars.length} |
| Required | ${requiredVars.length} |
| Optional | ${snapshot.envVars.length - requiredVars.length} |

---

## Required Variables Checklist

Before deploying, ensure these critical variables are configured:

${requiredVars.map(v => `- [ ] \`${v.name}\` - ${v.description || v.category}`).join("\n")}

---

## Variables by Category

${sections}

---

## Setup Instructions

### For Replit Deployment

1. Navigate to the **Secrets** tab in your Replit workspace
2. Click **New Secret** for each required variable
3. Enter the key name exactly as shown (case-sensitive)
4. Paste the secret value
5. Click **Add Secret**
6. Restart the application after adding all secrets

### For Local Development

Create a \`.env\` file in the project root:

\`\`\`bash
# Database (auto-configured on Replit)
DATABASE_URL=postgresql://user:pass@localhost:5432/powerplunge

# Stripe (required for payments)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (required for notifications)
MAILGUN_API_KEY=key-...
MAILGUN_DOMAIN=mg.yourdomain.com
\`\`\`

> **Security Note**: Never commit \`.env\` files to version control. The \`.gitignore\` file should exclude \`.env\` by default.

---

## Obtaining API Keys

### Stripe

1. Create account at [stripe.com](https://stripe.com)
2. Navigate to Developers > API keys
3. Copy the publishable key and secret key
4. For webhooks: Developers > Webhooks > Add endpoint
   - Endpoint URL: \`https://your-domain.com/api/webhook/stripe\`
   - Select events: \`payment_intent.succeeded\`, \`payment_intent.payment_failed\`

### Mailgun

1. Create account at [mailgun.com](https://mailgun.com)
2. Add and verify your domain
3. Navigate to Sending > Domain settings > API keys
4. Copy the API key

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Database connection fails | Verify \`DATABASE_URL\` format and credentials |
| Stripe payments fail | Check API key mode (test vs live) matches environment |
| Emails not sending | Verify Mailgun domain is verified and API key is correct |
| Webhook signature fails | Ensure \`STRIPE_WEBHOOK_SECRET\` matches webhook endpoint |

---

## Manual Notes

*Add environment-specific configuration notes, deployment checklists, or troubleshooting tips below. This section is preserved during regeneration.*

`;
  }

  /**
   * Generate Integrations doc content
   */
  private generateIntegrationsDoc(snapshot: SystemSnapshot): string {
    return `# External Integrations

*Auto-generated on ${new Date().toLocaleString()}*

---

## Overview

Power Plunge integrates with several external services to provide payments, email delivery, authentication, and file storage. This document provides setup guides and troubleshooting information for each integration.

### Active Integrations

| Integration | Purpose | Status |
|-------------|---------|--------|
${snapshot.integrations.map(i => `| **${i.name}** | ${i.description} | Active |`).join("\n")}

---

## Stripe Payment Integration

### Purpose
Handles all payment processing including credit cards, digital wallets (Apple Pay, Google Pay), and refund processing.

### Features
- **Payment Intents**: Secure payment flow with client-side confirmation
- **Webhooks**: Real-time payment status updates
- **Refunds**: Full and partial refund processing
- **Customer Records**: Stripe customer creation for repeat purchases

### Required Environment Variables

| Variable | Description |
|----------|-------------|
| \`STRIPE_SECRET_KEY\` | Server-side API key (starts with \`sk_\`) |
| \`STRIPE_PUBLISHABLE_KEY\` | Client-side API key (starts with \`pk_\`) |
| \`STRIPE_WEBHOOK_SECRET\` | Webhook signing secret (starts with \`whsec_\`) |

### Setup Guide

1. **Create Stripe Account**
   - Go to [dashboard.stripe.com](https://dashboard.stripe.com)
   - Complete business verification

2. **Get API Keys**
   - Navigate to Developers > API keys
   - Copy both publishable and secret keys
   - Use test keys for development (\`sk_test_\`, \`pk_test_\`)

3. **Configure Webhook**
   - Go to Developers > Webhooks
   - Click "Add endpoint"
   - URL: \`https://your-domain.com/api/webhook/stripe\`
   - Events to subscribe:
     - \`payment_intent.succeeded\`
     - \`payment_intent.payment_failed\`
     - \`charge.refunded\`
   - Copy the signing secret

4. **Add Secrets in Replit**
   - Add all three environment variables to Replit Secrets

### Code Location
- Integration code: \`server/src/integrations/stripe/\`
- Webhook handler: \`server/routes.ts\` (POST /api/webhook/stripe)

### Troubleshooting

| Issue | Solution |
|-------|----------|
| "No such payment intent" | Verify API keys match the environment (test vs live) |
| Webhook signature failed | Ensure webhook secret is correct and not URL-encoded |
| Card declined | Check Stripe test card numbers for testing |

---

## Mailgun Email Integration

### Purpose
Sends transactional emails including order confirmations, shipping notifications, and recovery emails.

### Features
- **Order Emails**: Confirmation upon purchase
- **Shipping Updates**: Notifications when orders ship
- **Recovery Emails**: Abandoned cart reminders
- **Affiliate Notifications**: Approval and payout emails

### Required Environment Variables

| Variable | Description |
|----------|-------------|
| \`MAILGUN_API_KEY\` | API key from Mailgun dashboard |
| \`MAILGUN_DOMAIN\` | Your verified sending domain |

### Setup Guide

1. **Create Mailgun Account**
   - Go to [mailgun.com](https://mailgun.com)
   - Sign up for a free account

2. **Add Sending Domain**
   - Go to Sending > Domains
   - Click "Add Domain"
   - Add DNS records as instructed
   - Wait for verification (can take 24-48 hours)

3. **Get API Key**
   - Go to Settings > API Security
   - Create a new API key or copy existing

4. **Configure in Replit**
   - Add \`MAILGUN_API_KEY\` and \`MAILGUN_DOMAIN\` to secrets

### Email Templates
Email templates are managed in the admin panel at \`/admin/settings\` under the Email Templates section.

### Code Location
- Integration code: \`server/src/integrations/mailgun/\`
- Email service: \`server/src/services/email.service.ts\`

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Emails not sending | Verify domain is verified in Mailgun |
| Emails going to spam | Add SPF and DKIM records |
| "Invalid API key" | Regenerate API key and update secret |

---

## Replit Auth Integration

### Purpose
Provides customer authentication via OpenID Connect, supporting Google, Apple, and email login.

### Features
- **Social Login**: Google and Apple sign-in buttons
- **Session Management**: Secure cookie-based sessions
- **Profile Sync**: Automatic profile creation on first login
- **SSO**: Single sign-on across Replit ecosystem

### Required Environment Variables

| Variable | Description |
|----------|-------------|
| \`SESSION_SECRET\` | Random string for session encryption |

Note: \`REPLIT_DOMAINS\` is auto-configured by Replit.

### How It Works

1. Customer clicks "Sign In" button
2. Redirected to Replit auth page
3. Customer authenticates with Google/Apple
4. Callback returns with OIDC tokens
5. Session created with customer profile

### Code Location
- Integration code: \`server/src/integrations/replit/auth/\`
- Auth middleware: \`server/src/middleware/auth.ts\`

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Login redirect fails | Verify deployment URL matches Replit configuration |
| Session expires quickly | Check SESSION_SECRET is set |
| Profile not created | Check customer table schema matches expected fields |

---

## Replit Object Storage Integration

### Purpose
Provides file storage for product images, customer uploads, and other assets.

### Features
- **Image Uploads**: Product and category images
- **CDN Delivery**: Fast global asset delivery
- **Automatic Cleanup**: Unused files can be purged

### Setup
Object Storage is automatically configured when enabled in your Replit workspace. No additional environment variables required.

### Code Location
- Integration code: \`server/src/integrations/replit/object-storage/\`
- Upload endpoints: \`server/routes.ts\`

### Usage Example

\`\`\`typescript
import { objectStorage } from "./integrations/replit/object-storage";

// Upload file
const url = await objectStorage.upload(buffer, filename, contentType);

// Delete file
await objectStorage.delete(filename);
\`\`\`

---

## Adding New Integrations

When adding a new external service:

1. Create a new directory under \`server/src/integrations/\`
2. Export a singleton client or service class
3. Add required environment variables to this documentation
4. Update the docs generator to detect the new integration

---

## Manual Notes

*Add integration-specific notes, custom configurations, or troubleshooting tips below. This section is preserved during regeneration.*

`;
  }

  /**
   * Generate Feature Catalog doc content
   */
  private generateFeatureCatalogDoc(): string {
    return `# Feature Catalog

*Auto-generated on ${new Date().toLocaleString()}*

---

## Overview

This document provides a comprehensive catalog of all features available in the Power Plunge platform, organized by module and user role.

---

## Customer-Facing Features

### Product Catalog & Storefront

| Feature | Description |
|---------|-------------|
| **Product Display** | Grid/list view of cold plunge tanks with images, pricing, features |
| **Product Details** | Full specifications, feature lists, "what's included" sections |
| **Image Gallery** | Primary and secondary product images with lightbox |
| **Pricing Display** | Base price, optional upsells, promotional pricing |

**UI Location**: Homepage (\`/\`), Product pages  
**Key Endpoints**: \`GET /api/products\`, \`GET /api/products/:id\`

---

### Shopping Cart

| Feature | Description |
|---------|-------------|
| **Add to Cart** | Add products with quantity selection |
| **Cart Drawer** | Slide-out cart preview without page navigation |
| **Quantity Adjustment** | Increase/decrease item quantities |
| **Cart Upsells** | Suggested complementary products |
| **Remove Items** | Remove individual items from cart |
| **Cart Persistence** | Cart saved in session for return visitors |

**UI Location**: Cart drawer (global), \`/cart\`  
**Implementation**: Client-side state with TanStack Query

---

### Checkout Flow

| Feature | Description |
|---------|-------------|
| **Customer Information** | Email, name, phone collection |
| **Shipping Address** | Full address form with validation |
| **Coupon/Promo Codes** | Apply discount codes at checkout |
| **Affiliate Tracking** | Automatic referral code detection from URL |
| **Payment Processing** | Stripe integration with card/wallet payments |
| **Order Summary** | Review items, subtotal, shipping, tax, total |
| **Post-Purchase Upsell** | One-click upsell offers after payment |

**UI Location**: \`/checkout\`, \`/order-success\`  
**Key Endpoints**: \`POST /api/checkout\`, \`POST /api/create-payment-intent\`

---

### Customer Account Portal

| Feature | Description |
|---------|-------------|
| **Authentication** | Login via Replit Auth (Google, Apple, email) |
| **Order History** | View all past orders with status tracking |
| **Order Details** | Individual order view with line items |
| **Profile Management** | Update name, email, phone |
| **VIP Status Tracking** | View current tier and progress to next level |
| **Affiliate Dashboard** | Enrolled affiliates see referral stats |

**UI Location**: \`/my-account\`  
**Key Endpoints**: \`GET /api/customer/profile\`, \`GET /api/customer/orders\`

---

### Affiliate Program (Customer Portal)

| Feature | Description |
|---------|-------------|
| **Program Application** | Apply to become an affiliate |
| **E-Sign Agreement** | Digital signature for affiliate terms |
| **Referral Link** | Unique tracking URL with affiliate code |
| **Commission Dashboard** | View referrals, earnings, payout history |
| **Payout Requests** | Request commission payouts (minimum threshold) |

**UI Location**: \`/my-account\` (Affiliate tab)  
**Key Endpoints**: \`POST /api/customer/affiliate/apply\`, \`GET /api/customer/affiliate\`

---

## Admin Features

### Dashboard & Analytics

| Feature | Description |
|---------|-------------|
| **KPI Cards** | Revenue, orders, customers, conversion rate |
| **Revenue Charts** | Daily/weekly/monthly revenue trends |
| **Order Activity** | Recent orders feed |
| **Alert Notifications** | Revenue guardrail warnings |
| **Quick Actions** | Links to common tasks |

**UI Location**: \`/admin/dashboard\`  
**Key Endpoints**: \`GET /api/admin/dashboard\`

---

### Order Management

| Feature | Description |
|---------|-------------|
| **Order List** | Searchable, filterable order grid |
| **Order Details** | Full order view with customer info, items, payment |
| **Status Updates** | Change order status (pending → shipped → delivered) |
| **Order Notes** | Internal notes for team communication |
| **Refund Processing** | Initiate full/partial refunds via Stripe |
| **Manual Order Creation** | Create orders on behalf of customers |
| **Export** | Download orders as CSV |

**UI Location**: \`/admin/orders\`  
**Key Endpoints**: \`GET /api/admin/orders\`, \`PATCH /api/admin/orders/:id\`

---

### Product Management

| Feature | Description |
|---------|-------------|
| **Product List** | All products with quick-edit capabilities |
| **Product Editor** | Full CRUD for product details |
| **Image Upload** | Upload and manage product images |
| **Feature Builder** | Add/edit product feature bullets |
| **Pricing Control** | Set base price, sale prices |
| **Active/Inactive Toggle** | Show/hide products from storefront |
| **Product Relationships** | Define upsells, cross-sells |

**UI Location**: \`/admin/products\`  
**Key Endpoints**: \`GET/POST/PATCH/DELETE /api/admin/products\`

---

### Customer Management (CRM)

| Feature | Description |
|---------|-------------|
| **Customer List** | Searchable customer directory |
| **Customer Profile Drawer** | Detailed view with order history |
| **Customer Tags** | Custom tagging for segmentation |
| **VIP Management** | Manual tier adjustments |
| **Audit Log** | View customer activity history |
| **Customer Notes** | Internal notes per customer |
| **Export** | Download customer list as CSV |

**UI Location**: \`/admin/customers\`  
**Key Endpoints**: \`GET /api/admin/customers\`, \`GET /api/admin/customers/:id\`

---

### Affiliate Management

| Feature | Description |
|---------|-------------|
| **Affiliate List** | All affiliates with status and earnings |
| **Application Review** | Approve/reject affiliate applications |
| **Commission Rates** | Set individual or default commission rates |
| **Referral Tracking** | View all referrals per affiliate |
| **Payout Management** | Process affiliate payouts |
| **Performance Analytics** | Top affiliates, conversion rates |
| **Agreement Management** | View signed affiliate agreements |

**UI Location**: \`/admin/affiliates\`  
**Key Endpoints**: \`GET /api/admin/affiliates\`, \`POST /api/admin/affiliates/:id/approve\`

---

### Coupon & Promotions

| Feature | Description |
|---------|-------------|
| **Coupon List** | All coupons with usage stats |
| **Coupon Creation** | Percentage or fixed-amount discounts |
| **Usage Limits** | Max uses, per-customer limits |
| **Expiration Dates** | Auto-expire underperforming coupons |
| **Stacking Rules** | Control coupon + affiliate combinations |
| **Performance Analytics** | Revenue attributed to each coupon |

**UI Location**: \`/admin/coupons\`  
**Key Endpoints**: \`GET/POST/PATCH/DELETE /api/admin/coupons\`

---

### VIP Program Management

| Feature | Description |
|---------|-------------|
| **Tier Configuration** | Define tier thresholds (spend/order count) |
| **Benefits Setup** | Configure discounts, free shipping per tier |
| **Auto-Promotion** | Automatic tier upgrades based on triggers |
| **Manual Adjustments** | Override customer VIP status |
| **VIP Analytics** | Distribution and revenue by tier |

**UI Location**: \`/admin/settings\` (VIP tab)  
**Key Endpoints**: \`GET/PATCH /api/admin/vip-settings\`

---

### Revenue Guardrails

| Feature | Description |
|---------|-------------|
| **Metric Monitoring** | Track refund rate, AOV, affiliate costs |
| **Alert Thresholds** | Configurable warning levels |
| **Dashboard Alerts** | Visual warnings when thresholds exceeded |
| **Historical Trends** | Track metrics over time |
| **Webhook Health** | Monitor Stripe webhook delivery |

**UI Location**: \`/admin/guardrails\`  
**Key Endpoints**: \`GET /api/admin/revenue-guardrails\`

---

### Checkout Recovery

| Feature | Description |
|---------|-------------|
| **Abandoned Cart Tracking** | Detect incomplete checkouts |
| **Recovery Emails** | Automated follow-up emails |
| **Recovery Analytics** | Lost revenue vs recovered revenue |
| **Session Details** | View abandoned cart contents |

**UI Location**: \`/admin/recovery\`  
**Key Endpoints**: \`GET /api/admin/checkout-recovery\`

---

### Documentation Library

| Feature | Description |
|---------|-------------|
| **Document Management** | Create/edit/delete documentation |
| **Markdown Editor** | Rich markdown editing with preview |
| **Category Organization** | Folder-based categorization |
| **Version History** | Track and restore previous versions |
| **Auto-Generation** | Generate system docs from codebase |
| **Search** | Full-text search across all docs |

**UI Location**: \`/admin/docs\`  
**Key Endpoints**: \`GET/POST/PATCH/DELETE /api/admin/docs\`

---

### Settings & Configuration

| Feature | Description |
|---------|-------------|
| **Company Profile** | Business name, contact info, branding |
| **Email Templates** | Customize transactional email content |
| **Integration Settings** | Stripe, Mailgun configuration status |
| **Team Management** | Add/remove admin users |
| **Audit Logs** | System-wide activity history |

**UI Location**: \`/admin/settings\`  
**Key Endpoints**: \`GET/PATCH /api/admin/settings\`

---

## Integration Features

### Stripe Payment Integration

- Payment intent creation and confirmation
- Webhook handling for payment events
- Refund processing
- Payment method management

### Email Integration (Mailgun)

- Order confirmation emails
- Shipping notification emails
- Recovery emails for abandoned carts
- Affiliate approval/payout notifications

### Authentication (Replit Auth)

- Customer SSO with Google/Apple
- Session management
- Secure logout

### Object Storage

- Product image uploads
- File management for admin uploads

---

## Manual Notes

*Add feature specifications, user stories, or additional context below. This section is preserved during regeneration.*

`;
  }

  /**
   * Generate or update all system docs
   */
  async generateSystemDocs(): Promise<{ created: number; updated: number; snapshot: SystemSnapshot }> {
    const snapshot = await this.generateSnapshot();
    let created = 0;
    let updated = 0;
    
    const docsToGenerate = [
      { slug: "architecture-overview", title: "Architecture Overview", category: "architecture", content: this.generateArchitectureDoc(snapshot) },
      { slug: "api-reference", title: "API Reference", category: "architecture", content: this.generateApiReferenceDoc(snapshot) },
      { slug: "data-model", title: "Data Model Overview", category: "data-model", content: this.generateDataModelDoc(snapshot) },
      { slug: "environment-variables", title: "Environment Variables", category: "deployment", content: this.generateEnvVarsDoc(snapshot) },
      { slug: "integrations", title: "Integrations", category: "integrations", content: this.generateIntegrationsDoc(snapshot) },
      { slug: "feature-catalog", title: "Feature Catalog", category: "features", content: this.generateFeatureCatalogDoc() },
    ];
    
    for (const doc of docsToGenerate) {
      const existing = await storage.getDocBySlug(doc.slug);
      
      if (existing) {
        // Preserve manual notes section if present
        const manualNotesMatch = existing.content.match(/## Manual Notes[\s\S]*$/);
        let content = doc.content;
        if (manualNotesMatch && !doc.content.includes(manualNotesMatch[0])) {
          content = doc.content.replace(/## Manual Notes[\s\S]*$/, manualNotesMatch[0]);
        }
        
        await storage.updateDoc(existing.id, { content, status: "published" });
        updated++;
      } else {
        await storage.createDoc({
          slug: doc.slug,
          title: doc.title,
          category: doc.category,
          content: doc.content,
          tags: ["auto-generated", "system"],
          status: "published",
          sortOrder: 0,
          parentId: null,
        });
        created++;
      }
    }
    
    return { created, updated, snapshot };
  }

  /**
   * Get health check info
   */
  async getHealthCheck(): Promise<{
    routeCount: number;
    envVarCount: number;
    integrationCount: number;
    tableCount: number;
    docsCount: number;
    lastGenerated: string | null;
    warnings: string[];
  }> {
    const snapshot = await this.generateSnapshot();
    const docs = await storage.getDocs();
    const warnings: string[] = [];
    
    // Check for missing system docs
    const requiredSlugs = ["architecture-overview", "api-reference", "data-model", "environment-variables", "integrations"];
    for (const slug of requiredSlugs) {
      if (!docs.find(d => d.slug === slug)) {
        warnings.push(`Missing doc: ${slug}`);
      }
    }
    
    // Check for required env vars
    const requiredEnvVars = ["DATABASE_URL", "STRIPE_SECRET_KEY"];
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        warnings.push(`Missing required env var: ${envVar}`);
      }
    }
    
    // Find last generated timestamp from docs
    const archDoc = await storage.getDocBySlug("architecture-overview");
    const lastGenerated = archDoc?.updatedAt?.toISOString() || null;
    
    return {
      routeCount: snapshot.routes.length,
      envVarCount: snapshot.envVars.length,
      integrationCount: snapshot.integrations.length,
      tableCount: snapshot.tables.length,
      docsCount: docs.length,
      lastGenerated,
      warnings,
    };
  }
}

export const docsGeneratorService = new DocsGeneratorService();
