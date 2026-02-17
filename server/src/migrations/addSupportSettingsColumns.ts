import { pool } from "../../db";

export async function runSupportSettingsMigration() {
  const client = await pool.connect();
  try {
    const columns = [
      { name: "support_notify_emails", type: "TEXT" },
      { name: "support_notify_on_new", type: "BOOLEAN DEFAULT true" },
      { name: "support_notify_on_reply", type: "BOOLEAN DEFAULT true" },
      { name: "support_auto_reply_enabled", type: "BOOLEAN DEFAULT true" },
      { name: "support_auto_reply_message", type: "TEXT" },
      { name: "support_from_email", type: "TEXT" },
      { name: "support_sla_hours", type: "INTEGER DEFAULT 24" },
      { name: "support_business_hours", type: "TEXT" },
      { name: "support_inbound_replies_enabled", type: "BOOLEAN DEFAULT false" },
    ];

    for (const col of columns) {
      const check = await client.query(
        `SELECT 1 FROM information_schema.columns WHERE table_name = 'site_settings' AND column_name = $1`,
        [col.name]
      );
      if (check.rows.length === 0) {
        await client.query(`ALTER TABLE site_settings ADD COLUMN ${col.name} ${col.type}`);
        console.log(`[MIGRATION] Added ${col.name} to site_settings`);
      }
    }
    console.log("[MIGRATION] Support settings columns verified");
  } finally {
    client.release();
  }
}
