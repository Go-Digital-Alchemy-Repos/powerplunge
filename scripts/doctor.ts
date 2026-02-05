#!/usr/bin/env npx tsx
import { db } from "../server/db";
import { sql } from "drizzle-orm";

interface CheckResult {
  name: string;
  status: "ok" | "warning" | "error";
  message: string;
  action?: string;
}

const results: CheckResult[] = [];

function log(result: CheckResult) {
  results.push(result);
  const icon = result.status === "ok" ? "✓" : result.status === "warning" ? "⚠" : "✗";
  const color = result.status === "ok" ? "\x1b[32m" : result.status === "warning" ? "\x1b[33m" : "\x1b[31m";
  console.log(`${color}${icon}\x1b[0m ${result.name}: ${result.message}`);
  if (result.action) {
    console.log(`  → ${result.action}`);
  }
}

async function checkEnvVars() {
  console.log("\n📋 Environment Variables\n");
  
  const required = [
    { name: "DATABASE_URL", desc: "PostgreSQL connection string" },
    { name: "SESSION_SECRET", desc: "Session encryption key" },
  ];
  
  const optional = [
    { name: "STRIPE_SECRET_KEY", desc: "Stripe API secret key" },
    { name: "STRIPE_PUBLISHABLE_KEY", desc: "Stripe publishable key" },
    { name: "STRIPE_WEBHOOK_SECRET", desc: "Stripe webhook signing secret" },
    { name: "SENDGRID_API_KEY", desc: "SendGrid API key (legacy)" },
    { name: "MAILGUN_API_KEY", desc: "Mailgun API key" },
    { name: "MAILGUN_DOMAIN", desc: "Mailgun domain" },
  ];
  
  for (const envVar of required) {
    if (process.env[envVar.name]) {
      log({
        name: envVar.name,
        status: "ok",
        message: `Set (${envVar.desc})`,
      });
    } else {
      log({
        name: envVar.name,
        status: "error",
        message: `Missing - ${envVar.desc}`,
        action: `Set ${envVar.name} in your Secrets tab`,
      });
    }
  }
  
  for (const envVar of optional) {
    if (process.env[envVar.name]) {
      log({
        name: envVar.name,
        status: "ok",
        message: `Set (${envVar.desc})`,
      });
    } else {
      log({
        name: envVar.name,
        status: "warning",
        message: `Not set - ${envVar.desc}`,
        action: `Optional: Configure in Admin Settings or set ${envVar.name}`,
      });
    }
  }
}

async function checkDatabase() {
  console.log("\n🗄️  Database Connection\n");
  
  try {
    const result = await db.execute(sql`SELECT 1 as test`);
    log({
      name: "PostgreSQL Connection",
      status: "ok",
      message: "Connected successfully",
    });
    
    const tables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    const tableCount = (tables as any).length || 0;
    log({
      name: "Database Tables",
      status: tableCount > 0 ? "ok" : "warning",
      message: `${tableCount} tables found`,
      action: tableCount === 0 ? "Run: npm run db:push" : undefined,
    });
    
  } catch (error: any) {
    log({
      name: "PostgreSQL Connection",
      status: "error",
      message: `Failed: ${error.message}`,
      action: "Check DATABASE_URL and ensure database is running",
    });
  }
}

async function checkIntegrations() {
  console.log("\n🔌 Integrations\n");
  
  const stripeConfigured = !!(
    process.env.STRIPE_SECRET_KEY || 
    process.env.STRIPE_PUBLISHABLE_KEY
  );
  
  log({
    name: "Stripe",
    status: stripeConfigured ? "ok" : "warning",
    message: stripeConfigured ? "Configured via environment" : "Not configured",
    action: stripeConfigured ? undefined : "Configure in Admin > Settings > Integrations or set STRIPE_SECRET_KEY",
  });
  
  if (stripeConfigured && process.env.STRIPE_SECRET_KEY) {
    const isLive = process.env.STRIPE_SECRET_KEY.startsWith("sk_live_");
    log({
      name: "Stripe Mode",
      status: "ok",
      message: isLive ? "Live mode" : "Test mode",
    });
  }
  
  const mailgunConfigured = !!(
    process.env.MAILGUN_API_KEY || 
    process.env.MAILGUN_DOMAIN
  );
  
  const sendgridConfigured = !!process.env.SENDGRID_API_KEY;
  
  if (mailgunConfigured) {
    log({
      name: "Email (Mailgun)",
      status: "ok",
      message: "Configured via environment",
    });
  } else if (sendgridConfigured) {
    log({
      name: "Email (SendGrid)",
      status: "ok",
      message: "Configured via environment",
    });
  } else {
    log({
      name: "Email",
      status: "warning",
      message: "Not configured",
      action: "Configure in Admin > Settings > Email Templates or set MAILGUN_API_KEY",
    });
  }
}

function printSummary() {
  console.log("\n" + "─".repeat(50));
  
  const errors = results.filter(r => r.status === "error").length;
  const warnings = results.filter(r => r.status === "warning").length;
  const ok = results.filter(r => r.status === "ok").length;
  
  console.log(`\n📊 Summary: ${ok} passed, ${warnings} warnings, ${errors} errors\n`);
  
  if (errors > 0) {
    console.log("\x1b[31m❌ Fix the errors above before deploying.\x1b[0m\n");
    process.exit(1);
  } else if (warnings > 0) {
    console.log("\x1b[33m⚠️  Some optional configurations are missing.\x1b[0m\n");
  } else {
    console.log("\x1b[32m✅ All checks passed! Your environment is ready.\x1b[0m\n");
  }
}

async function main() {
  console.log("\n🩺 Power Plunge Environment Doctor\n");
  console.log("─".repeat(50));
  
  await checkEnvVars();
  await checkDatabase();
  await checkIntegrations();
  printSummary();
}

main().catch((error) => {
  console.error("Doctor script failed:", error);
  process.exit(1);
});
