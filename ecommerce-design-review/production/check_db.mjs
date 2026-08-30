import pg from 'pg';
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const cols = await client.query(
  `SELECT column_name FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position`
);
console.log('=== COLUMNS in users ===');
cols.rows.forEach(r => console.log(' -', r.column_name));

const count = await client.query(`SELECT COUNT(*) FROM users`);
console.log('\nTotal users:', count.rows[0].count);

await client.end();
