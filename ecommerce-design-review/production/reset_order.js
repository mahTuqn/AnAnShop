import { getPrisma } from "./src/lib/server/prisma.js";

async function main() {
  const prisma = getPrisma();
  await prisma.order.update({
    where: { code: 'AN260829817606' },
    data: { status: 'DELIVERED' }
  });
  console.log("Order reset to DELIVERED");
}

main().catch(console.error);
