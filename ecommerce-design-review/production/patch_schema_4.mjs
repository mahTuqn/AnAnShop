import pg from 'pg';
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query(`
    ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
  `);
  console.log('Database schema patched successfully (resolved_at)');
} catch (e) {
  console.error(e);
} finally {
  await client.end();
}
