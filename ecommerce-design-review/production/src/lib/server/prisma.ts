import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __anAnPrisma: PrismaClient | undefined;
}

export function getPrisma(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required for persistent runtime");
  if (!globalThis.__anAnPrisma) {
    globalThis.__anAnPrisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  }
  return globalThis.__anAnPrisma;
}

