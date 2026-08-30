import { readFileSync, writeFileSync } from "node:fs";

function replace(path, before, after) {
  const source = readFileSync(path, "utf8");
  if (!source.includes(before)) throw new Error(`Expected source not found: ${path}`);
  writeFileSync(path, source.replace(before, after), "utf8");
}

replace("src/modules/order/index.ts", "findByIdempotencyKey(key: string): Promise<Order | null>;", "findByIdempotencyKey(key: string, ownerKey: string): Promise<Order | null>;");
replace("src/modules/checkout/index.ts", "const replay = await this.orders.findByIdempotencyKey(input.idempotencyKey);", "const replay = await this.orders.findByIdempotencyKey(input.idempotencyKey, input.ownerKey);");
replace("src/lib/server/runtime.ts",
  `async findByIdempotencyKey(key: string): Promise<Order | null> { return structuredClone([...this.orders.values()].find((order) => order.idempotencyKey === key) ?? null); }`,
  `async findByIdempotencyKey(key: string, ownerKey: string): Promise<Order | null> { return structuredClone([...this.orders.values()].find((order) => order.idempotencyKey === key && order.ownerKey === ownerKey) ?? null); }`);
replace("src/lib/server/runtime.ts",
  `const existing = [...this.orders.values()].find((order) => order.idempotencyKey === candidate.idempotencyKey);`,
  `const existing = [...this.orders.values()].find((order) => order.idempotencyKey === candidate.idempotencyKey && order.ownerKey === candidate.ownerKey);`);
replace("src/lib/server/persistent-store.ts",
  `async findByIdempotencyKey(key: string): Promise<Order | null> {\n    const record = await this.db.order.findFirst({ where: { idempotencyKey: key }, include: orderInclude });\n    return record ? mapOrder(record) : null;\n  }`,
  `async findByIdempotencyKey(key: string, ownerKey: string): Promise<Order | null> {\n    const record = await this.db.order.findFirst({ where: { idempotencyKey: scopedIdempotencyKey(key, ownerKey) }, include: orderInclude });\n    return record ? { ...mapOrder(record), idempotencyKey: key, ownerKey } : null;\n  }`);
replace("src/lib/server/persistent-store.ts",
  `const replay = await tx.order.findFirst({ where: { idempotencyKey: candidate.idempotencyKey }, include: orderInclude });\n        if (replay) return mapOrder(replay);`,
  `const storageKey = scopedIdempotencyKey(candidate.idempotencyKey, candidate.ownerKey);\n        const replay = await tx.order.findFirst({ where: { idempotencyKey: storageKey }, include: orderInclude });\n        if (replay) return { ...mapOrder(replay), idempotencyKey: candidate.idempotencyKey, ownerKey: candidate.ownerKey };`);
replace("src/lib/server/persistent-store.ts", `idempotencyKey: candidate.idempotencyKey, placedAt: candidate.placedAt`, `idempotencyKey: storageKey, placedAt: candidate.placedAt`);
replace("src/lib/server/persistent-store.ts", `return mapOrder(created);`, `return { ...mapOrder(created), idempotencyKey: candidate.idempotencyKey, ownerKey: candidate.ownerKey };`);
replace("src/lib/server/persistent-store.ts", `const hashToken = (token: string): string => createHash("sha256").update(token).digest("hex");`, `const hashToken = (token: string): string => createHash("sha256").update(token).digest("hex");\nconst scopedIdempotencyKey = (key: string, ownerKey: string): string => createHash("sha256").update(ownerKey).update("\\0").update(key).digest("hex");`);
