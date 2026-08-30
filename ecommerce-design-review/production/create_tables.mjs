import pg from 'pg';
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS return_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id UUID NOT NULL,
      status VARCHAR(50) NOT NULL,
      reason VARCHAR(500) NOT NULL,
      admin_note VARCHAR(500),
      requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      was_accepted BOOLEAN NOT NULL DEFAULT FALSE
    );

    CREATE TABLE IF NOT EXISTS coupon_redemptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      coupon_id UUID NOT NULL,
      order_id UUID NOT NULL,
      user_id UUID
    );

    CREATE TABLE IF NOT EXISTS coupon_products (
      coupon_id UUID NOT NULL,
      product_id UUID NOT NULL,
      PRIMARY KEY (coupon_id, product_id)
    );

    CREATE TABLE IF NOT EXISTS coupon_categories (
      coupon_id UUID NOT NULL,
      category_id VARCHAR(50) NOT NULL,
      PRIMARY KEY (coupon_id, category_id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID,
      channel VARCHAR(50) NOT NULL,
      template_code VARCHAR(100) NOT NULL,
      recipient VARCHAR(255) NOT NULL,
      payload JSONB NOT NULL,
      status VARCHAR(50) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS order_status_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id UUID NOT NULL,
      status VARCHAR(50) NOT NULL,
      admin_note VARCHAR(500),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log('Tables created');
} catch (e) {
  console.error(e);
} finally {
  await client.end();
}
