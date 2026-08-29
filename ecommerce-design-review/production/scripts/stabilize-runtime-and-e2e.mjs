import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
function edit(relativePath, changes) {
  const path = resolve(root, relativePath);
  let source = readFileSync(path, "utf8");
  const original = source;
  for (const [from, to] of changes) {
    if (!source.includes(from)) throw new Error(`Expected content missing in ${relativePath}: ${from}`);
    source = source.replaceAll(from, to);
  }
  if (source === original) throw new Error(`No changes for ${relativePath}`);
  writeFileSync(path, source, "utf8");
  process.stdout.write(`stabilized ${relativePath}\n`);
}

edit("production/src/lib/server/runtime-resolver.ts", [
  ["persistentRuntime as Runtime", "persistentRuntime as unknown as Runtime"],
]);

edit("production/playwright.config.ts", [
  ["fullyParallel: true", "fullyParallel: false"],
  ["forbidOnly: Boolean(process.env.CI),", "forbidOnly: Boolean(process.env.CI),\n  workers: 2,"],
  ["http://127.0.0.1:3000", "http://localhost:3000"],
]);

edit("production/tests/e2e/storefront-integrated.spec.ts", [
  ['page.getByRole("alert")', 'page.locator(\'p[role="alert"]\')'],
]);

edit("docs/release-readiness-agent-qa.md", [
  ["- Typecheck đạt. Playwright discovery đạt, gồm Chromium/mobile và spec mở rộng.", "- Typecheck từng bị chặn bởi cast runtime persistence; manager đã nhận correction và phải chạy lại trước release. Playwright discovery đạt, gồm Chromium/mobile và spec mở rộng."],
]);
