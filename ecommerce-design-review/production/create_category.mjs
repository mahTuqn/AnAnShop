import pg from 'pg';
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query("INSERT INTO categories(name, slug) VALUES('Mặc định', 'mac-dinh') ON CONFLICT DO NOTHING");
  console.log('Category created');
} catch (e) {
  console.error(e);
} finally {
  await client.end();
}
