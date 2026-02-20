import pg from "pg";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is missing");
  }

  const pool = new pg.Pool({ connectionString });
  try {
    const latestOrder = (
      await pool.query(
        `select id,status,payment_status,total_amount,marketing_consent_granted,meta_fbp,meta_fbc,meta_event_source_url,created_at
         from orders
         order by created_at desc
         limit 1`
      )
    ).rows[0] || null;

    const outbox = (
      await pool.query(
        `select id,event_key,event_name,status,attempt_count,last_error,sent_at,created_at,updated_at
         from meta_capi_events
         order by created_at desc
         limit 10`
      )
    ).rows;

    const stats = (
      await pool.query(
        `select
           count(*) filter (where status='queued')::int as queued,
           count(*) filter (where status='retry')::int as retry,
           count(*) filter (where status='processing')::int as processing,
           count(*) filter (where status='failed')::int as failed,
           count(*) filter (where status='sent')::int as sent,
           max(sent_at) as last_sent_at
         from meta_capi_events`
      )
    ).rows[0];

    console.log(JSON.stringify({ latestOrder, outbox, stats }, null, 2));
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
