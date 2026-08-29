import fs from "node:fs";

for (const file of ["production/docker-compose.yml", "production/.env.example"]) {
  const source = fs.readFileSync(file, "utf8");
  const updated = source.replaceAll("localhost:5432", "localhost:5433").replace('      - "5432:5432"', '      - "5433:5432"');
  if (updated === source) throw new Error(`No PostgreSQL port reference changed in ${file}`);
  fs.writeFileSync(file, updated, "utf8");
}
console.log("Project PostgreSQL host port moved to 5433 to avoid unrelated service collision.");
