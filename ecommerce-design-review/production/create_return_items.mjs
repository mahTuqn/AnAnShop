import pg from 'pg';
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS return_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      return_request_id UUID NOT NULL,
      order_item_id UUID NOT NULL,
      quantity INT NOT NULL,
      refund_amount NUMERIC NOT NULL,
      condition VARCHAR(100),
      resolution VARCHAR(100)
    );

    CREATE TABLE IF NOT EXISTS refunds (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      payment_id UUID NOT NULL,
      return_request_id UUID NOT NULL,
      amount NUMERIC NOT NULL,
      reason VARCHAR(1000),
      status VARCHAR(50) NOT NULL,
      idempotency_key VARCHAR(100) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log('Tables created');
} catch (e) {
  console.error(e);
} finally {
  await client.end();
}
