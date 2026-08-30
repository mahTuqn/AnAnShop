import pg from 'pg';
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS addresses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      label VARCHAR(50),
      full_name VARCHAR(150) NOT NULL,
      phone VARCHAR(20) NOT NULL,
      province VARCHAR(100) NOT NULL,
      district VARCHAR(100) NOT NULL,
      ward VARCHAR(100) NOT NULL,
      line1 VARCHAR(255) NOT NULL,
      postal_code VARCHAR(20),
      is_default BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log('Database schema patched successfully (addresses table)');
} catch (e) {
  console.error(e);
} finally {
  await client.end();
}
