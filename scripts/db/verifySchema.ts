#!/usr/bin/env npx tsx
import { db } from "../../server/db";
import { sql } from "drizzle-orm";

const EXPECTED_TABLES = [
  "abandoned_carts",
  "admin_audit_logs",
  "admin_notification_prefs",
  "admin_users",
  "affiliate_agreements",
  "affiliate_clicks",
  "affiliate_invites",
  "affiliate_payout_accounts",
  "affiliate_payouts",
  "affiliate_referrals",
  "affiliate_settings",
  "affiliates",
  "audit_logs",
  "categories",
  "cms_v2_menus",
  "cms_v2_posts",
  "coupon_redemptions",
  "coupon_stacking_rules",
  "coupons",
  "customer_magic_link_tokens",
  "customer_notes",
  "customer_tags",
  "customers",
  "daily_metrics",
  "doc_versions",
  "docs",
  "email_events",
  "email_settings",
  "email_templates",
  "experiment_assignments",
  "experiment_conversions",
  "experiments",
  "failed_payments",
  "integration_settings",
  "inventory",
  "inventory_ledger",
  "job_runs",
  "media_library",
  "order_items",
  "orders",
  "pages",
  "password_reset_tokens",
  "post_purchase_offers",
  "preset_apply_history",
  "processed_webhook_events",
  "product_categories",
  "product_relationships",
  "products",
  "recovery_events",
  "refunds",
  "revenue_alert_thresholds",
  "revenue_alerts",
  "saved_sections",
  "shipments",
  "shipping_rates",
  "shipping_zones",
  "site_presets",
  "site_settings",
  "support_tickets",
  "theme_packs",
  "theme_settings",
  "upsell_events",
  "upsell_rules",
  "vip_activity_log",
  "vip_customers",
  "vip_settings",
  "webhook_failures",
];

async function verifySchema() {
  console.log("=== DB Schema Verification ===\n");

  const result = await db.execute(
    sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
  );

  const dbTables = new Set(
    (result.rows as { tablename: string }[]).map((r) => r.tablename)
  );

  let pass = 0;
  let fail = 0;
  const missing: string[] = [];

  for (const table of EXPECTED_TABLES) {
    if (dbTables.has(table)) {
      pass++;
    } else {
      fail++;
      missing.push(table);
      console.log(`FAIL  table "${table}" is missing`);
    }
  }

  const extra = [...dbTables].filter(
    (t) => !EXPECTED_TABLES.includes(t)
  );

  console.log("");
  console.log(`Checked: ${EXPECTED_TABLES.length} expected tables`);
  console.log(`PASS:    ${pass}`);
  console.log(`FAIL:    ${fail}`);

  if (missing.length > 0) {
    console.log(`\nMissing tables: ${missing.join(", ")}`);
  }

  if (extra.length > 0) {
    console.log(`\nExtra tables (not in schema, may be from plugins/migrations):`);
    for (const t of extra) {
      console.log(`  - ${t}`);
    }
  }

  console.log("\n=== Seed Invariants ===\n");

  const settingsResult = await db.execute(
    sql`SELECT id FROM site_settings WHERE id = 'main' LIMIT 1`
  );
  const hasMainRow = (settingsResult.rows as any[]).length > 0;
  console.log(
    hasMainRow
      ? "PASS  site_settings 'main' row exists"
      : "WARN  site_settings 'main' row missing (will be created on first request)"
  );

  const homeResult = await db.execute(
    sql`SELECT id, title FROM pages WHERE is_home = true LIMIT 2`
  );
  const homeRows = homeResult.rows as any[];
  if (homeRows.length === 1) {
    console.log(`PASS  exactly 1 home page ("${homeRows[0].title}")`);
  } else if (homeRows.length === 0) {
    console.log("WARN  no home page found (will be created by ensureCmsDefaults)");
  } else {
    console.log(`FAIL  ${homeRows.length} pages marked as home (should be exactly 1)`);
  }

  const shopResult = await db.execute(
    sql`SELECT id, title FROM pages WHERE is_shop = true LIMIT 2`
  );
  const shopRows = shopResult.rows as any[];
  if (shopRows.length === 1) {
    console.log(`PASS  exactly 1 shop page ("${shopRows[0].title}")`);
  } else if (shopRows.length === 0) {
    console.log("WARN  no shop page found (will be created by ensureCmsDefaults)");
  } else {
    console.log(`FAIL  ${shopRows.length} pages marked as shop (should be exactly 1)`);
  }

  const productResult = await db.execute(
    sql`SELECT count(*)::int as cnt FROM products WHERE active = true`
  );
  const productCount = (productResult.rows as any[])[0]?.cnt ?? 0;
  console.log(
    productCount > 0
      ? `PASS  ${productCount} active product(s) found`
      : "WARN  no active products (seed has not run or products were deactivated)"
  );

  console.log("\n=== Done ===");
  process.exit(fail > 0 ? 1 : 0);
}

verifySchema().catch((err) => {
  console.error("Schema verification failed:", err);
  process.exit(1);
});
