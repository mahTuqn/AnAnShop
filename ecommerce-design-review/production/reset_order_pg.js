import pkg from 'pg';
const { Client } = pkg;
async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query("UPDATE orders SET status = 'DELIVERED' WHERE code = 'AN260829817606'");
  console.log("Reset order to DELIVERED");
  await client.end();
}
main().catch(console.error);
