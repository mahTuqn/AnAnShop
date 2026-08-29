import { readFileSync, writeFileSync } from "node:fs";
const path = "docker-compose.yml";
let source = readFileSync(path, "utf8");
const marker = `      - ../database/migrations/0006_content_permissions.sql:/docker-entrypoint-initdb.d/06-content-permissions.sql:ro`;
if (!source.includes(marker)) throw new Error("Migration 0006 mount not found");
writeFileSync(path, source.replace(marker, `${marker}\n      - ../database/migrations/0007_notification_read_state.sql:/docker-entrypoint-initdb.d/07-notification-read.sql:ro`), "utf8");
