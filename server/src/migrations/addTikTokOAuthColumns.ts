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

export async function addTikTokOAuthColumns(): Promise<void> {
  try {
    await addColumnIfMissing("integration_settings", "tiktok_shop_cipher", "TEXT");
    await addColumnIfMissing("integration_settings", "tiktok_access_token_expires_at", "TIMESTAMP");
    await addColumnIfMissing("integration_settings", "tiktok_refresh_token_expires_at", "TIMESTAMP");
    await addColumnIfMissing("integration_settings", "tiktok_open_id", "TEXT");
    await addColumnIfMissing("integration_settings", "tiktok_seller_name", "TEXT");
    await addColumnIfMissing("integration_settings", "tiktok_seller_base_region", "TEXT");
    await addColumnIfMissing("integration_settings", "tiktok_granted_scopes", "JSONB");
    await addColumnIfMissing("integration_settings", "tiktok_import_runs", "JSONB DEFAULT '[]'::jsonb");

    console.log("[MIGRATION] TikTok OAuth columns verified");
  } catch (error: any) {
    console.error("[MIGRATION] Failed to add TikTok OAuth columns:", error.message);
    throw error;
  }
}
