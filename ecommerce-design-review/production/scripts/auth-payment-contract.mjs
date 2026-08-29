import { readFileSync, writeFileSync } from "node:fs";

function replace(path, before, after) {
  const source = readFileSync(path, "utf8");
  if (!source.includes(before)) throw new Error(`Expected source not found: ${path}`);
  writeFileSync(path, source.replace(before, after), "utf8");
}

replace("src/modules/auth/index.ts", `status: "PENDING_VERIFICATION", createdAt`, `status: "ACTIVE", createdAt`);
replace("src/lib/server/checkout-handler.ts", `const methods: Order["paymentMethod"][] = ["COD", "MOMO", "VNPAY", "CARD"];`, `// External gateways are deliberately disabled until signed provider adapters/webhooks exist.\nconst methods: Order["paymentMethod"][] = ["COD"];`);
replace("tests/unit/auth.test.ts", `expect(records[0].email).toBe("mother@example.com");`, `expect(records[0].email).toBe("mother@example.com");\n    expect(records[0].status).toBe("ACTIVE");`);
