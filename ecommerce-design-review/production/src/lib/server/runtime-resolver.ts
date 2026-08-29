import { runtime as memoryRuntime } from "./runtime";

export type Runtime = typeof memoryRuntime;

let selected: Promise<Runtime> | undefined;

/** Lazy import avoids constructing a database pool in builds/tests without DATABASE_URL. */
export function getRuntime(): Promise<Runtime> {
  if (process.env.USE_MEMORY_STORE === "true" || !process.env.DATABASE_URL) return Promise.resolve(memoryRuntime);
  selected ??= import("./runtime-persistent").then(({ persistentRuntime }) => persistentRuntime as unknown as Runtime);
  return selected;
}

