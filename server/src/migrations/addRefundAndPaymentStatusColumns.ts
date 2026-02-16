import { db } from "../../db";
import { sql } from "drizzle-orm";

export async function addRefundAndPaymentStatusColumns() {
  try {
    const paymentStatusCheck = await db.execute(sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'orders' AND column_name = 'payment_status'
    `);

    if (paymentStatusCheck.rows.length === 0) {
      await db.execute(sql`
        ALTER TABLE orders ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'unpaid'
      `);

      await db.execute(sql`
        UPDATE orders SET payment_status = 'paid' 
        WHERE status IN ('paid', 'shipped', 'delivered')
      `);

      console.log("[MIGRATION] Added payment_status column to orders table");
    } else {
      console.log("[MIGRATION] payment_status column already exists on orders table");
    }

    const reasonCodeCheck = await db.execute(sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'refunds' AND column_name = 'reason_code'
    `);

    if (reasonCodeCheck.rows.length === 0) {
      await db.execute(sql`
        ALTER TABLE refunds 
          ADD COLUMN reason_code TEXT,
          ADD COLUMN source TEXT NOT NULL DEFAULT 'stripe'
      `);
      console.log("[MIGRATION] Added reason_code and source columns to refunds table");
    } else {
      console.log("[MIGRATION] refunds columns already exist");
    }
  } catch (error: any) {
    console.error("[MIGRATION] Failed to add refund/payment status columns:", error.message);
    throw error;
  }
}
