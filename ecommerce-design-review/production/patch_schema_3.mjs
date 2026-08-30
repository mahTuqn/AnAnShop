import pg from 'pg';
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query(`
    -- Add updated_at to return_requests
    ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  `);
  console.log('Database schema patched successfully (updated_at)');
} catch (e) {
  console.error(e);
} finally {
  await client.end();
}
