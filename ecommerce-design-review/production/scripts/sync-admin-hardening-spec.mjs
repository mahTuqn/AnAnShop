import fs from "node:fs";

const file = "production/tests/e2e/admin-hardening.spec.ts";
const source = fs.readFileSync(file, "utf8");
const before = 'dialog.getByRole("button", { name: "Đóng", exact: true })';
const after = 'dialog.getByRole("button", { name: "Đóng chi tiết", exact: true })';
if (!source.includes(before)) throw new Error("Admin hardening close locator not found");
fs.writeFileSync(file, source.replace(before, after), "utf8");
console.log("Admin hardening spec synchronized with accessible label.");
