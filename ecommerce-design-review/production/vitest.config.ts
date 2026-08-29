import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/{unit,integration}/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["tests/e2e/**"],
    coverage: { reporter: ["text", "html"] },
  },
});
