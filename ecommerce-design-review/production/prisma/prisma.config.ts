import { defineConfig, env } from "prisma/config";

/**
 * Prisma 7 no longer accepts datasource URLs in schema.prisma.
 * The root prisma.config.ts should re-export this config, or CLI commands should
 * pass `--config prisma/prisma.config.ts`.
 */
export default defineConfig({
  schema: "./schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
});

