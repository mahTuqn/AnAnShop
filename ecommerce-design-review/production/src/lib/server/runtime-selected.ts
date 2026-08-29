import { runtime as memoryRuntime } from "./runtime";

/**
 * Drop-in runtime export for existing Route Handlers. The persistent module is
 * imported only when DATABASE_URL exists, so tests and UI-only builds stay local.
 */
export const runtime: typeof memoryRuntime = process.env.USE_MEMORY_STORE !== "true" && process.env.DATABASE_URL
  ? (await import("./runtime-persistent")).persistentRuntime as unknown as typeof memoryRuntime
  : memoryRuntime;

