import pg from 'pg';
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query(`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS carrier VARCHAR(100);
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_code VARCHAR(100);
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ;
  `);
  console.log('Database schema patched successfully (carrier & tracking_code)');
} catch (e) {
  console.error(e);
} finally {
  await client.end();
}
