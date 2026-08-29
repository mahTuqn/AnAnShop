import { readFileSync, writeFileSync } from "node:fs";
const path = "src/lib/server/account.ts";
writeFileSync(path, readFileSync(path, "utf8").replace(`new AppError("SERVICE_UNAVAILABLE",`, `new AppError("INTERNAL_ERROR",`), "utf8");
