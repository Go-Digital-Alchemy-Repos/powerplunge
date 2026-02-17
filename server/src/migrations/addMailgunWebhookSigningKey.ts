import { pool } from "../../db";

export async function runMailgunWebhookSigningKeyMigration() {
  const client = await pool.connect();
  try {
    const check = await client.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name = 'email_settings' AND column_name = 'mailgun_webhook_signing_key_encrypted'`
    );
    if (check.rows.length === 0) {
      await client.query(`ALTER TABLE email_settings ADD COLUMN mailgun_webhook_signing_key_encrypted TEXT`);
      console.log("[MIGRATION] Added mailgun_webhook_signing_key_encrypted to email_settings");
    }
    console.log("[MIGRATION] Mailgun webhook signing key column verified");
  } finally {
    client.release();
  }
}
