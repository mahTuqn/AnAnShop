import { readFileSync, writeFileSync } from "node:fs";
const path = "src/lib/server/persistent-store.ts";
writeFileSync(path, readFileSync(path, "utf8").replace(/^\+/gm, ""), "utf8");
