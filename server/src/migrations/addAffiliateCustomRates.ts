import { db } from "../../db";
import { sql } from "drizzle-orm";

export async function addAffiliateCustomRates() {
  try {
    const result = await db.execute(sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'affiliates' AND column_name = 'use_custom_rates'
    `);

    if (result.rows.length === 0) {
      await db.execute(sql`
        ALTER TABLE affiliates 
          ADD COLUMN use_custom_rates BOOLEAN NOT NULL DEFAULT false,
          ADD COLUMN custom_commission_type TEXT,
          ADD COLUMN custom_commission_value INTEGER,
          ADD COLUMN custom_discount_type TEXT,
          ADD COLUMN custom_discount_value INTEGER
      `);
      console.log("[MIGRATION] Added custom rate columns to affiliates table");
    } else {
      console.log("[MIGRATION] Custom rate columns already exist on affiliates table");
    }
  } catch (error: any) {
    console.error("[MIGRATION] Failed to add custom rate columns:", error.message);
    throw error;
  }
}
