const { PrismaClient } = require('./src/generated/prisma');

async function main() {
  const prisma = new PrismaClient();
  const tables = await prisma.$queryRawUnsafe("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
  console.log(tables.map(t => t.table_name));
  await prisma.$disconnect();
}

main().catch(console.error);
