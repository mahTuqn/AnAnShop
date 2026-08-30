import { readFileSync, writeFileSync } from "node:fs";

const composePath = "docker-compose.yml";
let compose = readFileSync(composePath, "utf8");
const marker = `      - ../database/migrations/0004_audit_permission.sql:/docker-entrypoint-initdb.d/04-audit-permission.sql:ro`;
if (!compose.includes(marker)) throw new Error("Compose migration marker not found");
compose = compose.replace(marker, `${marker}\n      - ../database/migrations/0005_customer_account_and_order_invariants.sql:/docker-entrypoint-initdb.d/05-customer-account.sql:ro\n      - ../database/migrations/0006_content_permissions.sql:/docker-entrypoint-initdb.d/06-content-permissions.sql:ro`);
writeFileSync(composePath, compose, "utf8");

const seedPath = "../database/seed.sql";
let seed = readFileSync(seedPath, "utf8");
const permissionMarker = `  (gen_random_uuid(), 'audit.read',       'Xem audit log')`;
if (!seed.includes(permissionMarker)) throw new Error("Seed permission marker not found");
seed = seed.replace(permissionMarker, `  (gen_random_uuid(), 'audit.read',       'Xem audit log'),\n  (gen_random_uuid(), 'content.read',     'Xem nội dung và banner'),\n  (gen_random_uuid(), 'content.write',    'Quản lý nội dung và banner')`);
writeFileSync(seedPath, seed, "utf8");
