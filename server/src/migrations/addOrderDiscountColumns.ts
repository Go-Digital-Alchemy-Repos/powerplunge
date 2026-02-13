import { db } from "../../db";
import { sql } from "drizzle-orm";

export async function addOrderDiscountColumns() {
  try {
    const result = await db.execute(sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'orders' AND column_name = 'affiliate_discount_amount'
    `);

    if (result.rows.length === 0) {
      await db.execute(sql`
        ALTER TABLE orders 
          ADD COLUMN affiliate_discount_amount INTEGER,
          ADD COLUMN coupon_discount_amount INTEGER,
          ADD COLUMN coupon_code TEXT
      `);
      console.log("[MIGRATION] Added discount columns to orders table");
    } else {
      console.log("[MIGRATION] Discount columns already exist on orders table");
    }
  } catch (error: any) {
    console.error("[MIGRATION] Failed to add discount columns:", error.message);
    throw error;
  }
}
