import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./src/generated/prisma/index.js";

async function main() {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  await prisma.order.update({
    where: { code: 'AN260829817606' },
    data: { status: 'DELIVERED' }
  });
  console.log("Order reset to DELIVERED");
  await prisma.$disconnect();
}

main().catch(console.error);
