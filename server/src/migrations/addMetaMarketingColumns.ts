import { db } from "../../db";
import { sql } from "drizzle-orm";

async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  const result = await db.execute(sql`
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = ${tableName}
      AND column_name = ${columnName}
    LIMIT 1
  `);
  return result.rows.length > 0;
}

async function addColumnIfMissing(tableName: string, columnName: string, definition: string): Promise<void> {
  const exists = await columnExists(tableName, columnName);
  if (exists) return;
  await db.execute(sql.raw(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`));
  console.log(`[MIGRATION] Added ${columnName} to ${tableName}`);
}

export async function addMetaMarketingColumns(): Promise<void> {
  try {
    // integration_settings meta columns
    await addColumnIfMissing("integration_settings", "meta_marketing_configured", "BOOLEAN DEFAULT false");
    await addColumnIfMissing("integration_settings", "meta_pixel_id", "TEXT");
    await addColumnIfMissing("integration_settings", "meta_catalog_id", "TEXT");
    await addColumnIfMissing("integration_settings", "meta_product_feed_id", "TEXT");
    await addColumnIfMissing("integration_settings", "meta_access_token_encrypted", "TEXT");
    await addColumnIfMissing("integration_settings", "meta_app_secret_encrypted", "TEXT");
    await addColumnIfMissing("integration_settings", "meta_test_event_code_encrypted", "TEXT");
    await addColumnIfMissing("integration_settings", "meta_catalog_feed_key_encrypted", "TEXT");
    await addColumnIfMissing("integration_settings", "meta_catalog_last_sync_at", "TIMESTAMP");
    await addColumnIfMissing("integration_settings", "meta_catalog_last_sync_status", "TEXT DEFAULT 'never'");
    await addColumnIfMissing("integration_settings", "meta_capi_enabled", "BOOLEAN DEFAULT false");
    await addColumnIfMissing("integration_settings", "meta_capi_last_dispatch_at", "TIMESTAMP");
    await addColumnIfMissing("integration_settings", "meta_capi_last_dispatch_status", "TEXT DEFAULT 'never'");

    // orders context columns
    await addColumnIfMissing("orders", "marketing_consent_granted", "BOOLEAN DEFAULT false");
    await addColumnIfMissing("orders", "meta_fbp", "TEXT");
    await addColumnIfMissing("orders", "meta_fbc", "TEXT");
    await addColumnIfMissing("orders", "meta_event_source_url", "TEXT");
    await addColumnIfMissing("orders", "customer_user_agent", "TEXT");

    // outbox table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS meta_capi_events (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        event_key TEXT NOT NULL UNIQUE,
        event_name TEXT NOT NULL,
        order_id VARCHAR REFERENCES orders(id),
        refund_id VARCHAR REFERENCES refunds(id),
        payload_json JSONB NOT NULL,
        status TEXT NOT NULL DEFAULT 'queued',
        attempt_count INTEGER NOT NULL DEFAULT 0,
        next_attempt_at TIMESTAMP NOT NULL DEFAULT NOW(),
        locked_at TIMESTAMP,
        lock_token TEXT,
        last_error TEXT,
        meta_trace_id TEXT,
        sent_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS meta_capi_events_status_next_attempt_idx
      ON meta_capi_events(status, next_attempt_at)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS meta_capi_events_order_id_idx
      ON meta_capi_events(order_id)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS meta_capi_events_refund_id_idx
      ON meta_capi_events(refund_id)
    `);

    console.log("[MIGRATION] Meta marketing columns and outbox table verified");
  } catch (error: any) {
    console.error("[MIGRATION] Failed to add Meta marketing columns:", error.message);
    throw error;
  }
}

