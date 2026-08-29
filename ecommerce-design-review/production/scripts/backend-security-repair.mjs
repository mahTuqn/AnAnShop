import { readFileSync, writeFileSync } from "node:fs";

for (const path of ["src/modules/cart/index.ts", "src/app/api/cart/route.ts"]) {
  const source = readFileSync(path, "utf8");
  writeFileSync(path, source.replace(/^\+/gm, ""), "utf8");
}
