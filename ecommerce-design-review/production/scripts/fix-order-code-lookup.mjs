import { readFileSync, writeFileSync } from "node:fs";

const path = "src/lib/server/persistent-store.ts";
let source = readFileSync(path, "utf8");
const importMarker = `import { getPrisma } from "./prisma";`;
if (!source.includes(importMarker)) throw new Error("Persistent store import marker not found");
source = source.replace(importMarker, `${importMarker}\nimport { orderLookupWhere } from "./order-lookup";`);
const before = `  async findById(id: string): Promise<Order | null> {\n    const record = await this.db.order.findUnique({ where: { id }, include: orderInclude });\n    return record ? mapOrder(record) : null;\n  }`;
const after = `  async findById(idOrCode: string): Promise<Order | null> {\n    const record = await this.db.order.findUnique({ where: orderLookupWhere(idOrCode), include: orderInclude });\n    return record ? mapOrder(record) : null;\n  }`;
if (!source.includes(before)) throw new Error("Persistent order lookup block not found");
writeFileSync(path, source.replace(before, after), "utf8");
