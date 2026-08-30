import fs from "node:fs";

const composeFile = "production/docker-compose.yml";
let compose = fs.readFileSync(composeFile, "utf8");
const seedMount = "      - ../database/seed.sql:/docker-entrypoint-initdb.d/02-seed.sql:ro";
if (!compose.includes(seedMount)) throw new Error("Base seed mount not found");
compose = compose.replace(seedMount, seedMount + "\n      - ../database/demo-catalog.seed.sql:/docker-entrypoint-initdb.d/03-demo-catalog.sql:ro");
fs.writeFileSync(composeFile, compose, "utf8");

const envFile = "production/.env.example";
let env = fs.readFileSync(envFile, "utf8");
env += '\nORDER_LOOKUP_SECRET="replace-with-at-least-32-random-characters"\nADMIN_DEMO_MODE="false"\n';
fs.writeFileSync(envFile, env, "utf8");
console.log("Local catalog mount and production-safe environment defaults added.");
