#!/usr/bin/env node
// Script tạo hash Argon2 cho mật khẩu admin và update seed.sql
import argon2 from "argon2";
import { readFileSync, writeFileSync } from "fs";

const password = process.argv[2] ?? "Admin@2026";
const hash = await argon2.hash(password);
console.log("Hash:", hash);

// Update seed.sql
const seedPath = new URL("../database/seed.sql", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
let seed = readFileSync(seedPath, "utf8");
seed = seed.replace("$argon2id$v=19$m=65536,t=3,p=4$placeholder_change_me", hash);
writeFileSync(seedPath, seed);
console.log("✅ seed.sql updated with real hash for password:", password);
