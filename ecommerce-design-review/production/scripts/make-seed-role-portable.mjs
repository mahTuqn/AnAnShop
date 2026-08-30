import { readFileSync, writeFileSync } from "node:fs";

const path = "../database/seed.sql";
let sql = readFileSync(path, "utf8");
const rolesBefore = `INSERT INTO roles (id, code, name, is_system) VALUES
  ('00000000-0000-0000-0000-000000000001', 'ADMIN', 'Quản trị viên', TRUE),
  ('00000000-0000-0000-0000-000000000002', 'STAFF', 'Nhân viên',      FALSE)
ON CONFLICT (code) DO NOTHING;`;
const rolesAfter = `INSERT INTO roles (code, name, is_system) VALUES
  ('ADMIN', 'Quản trị viên', TRUE),
  ('STAFF', 'Nhân viên', FALSE)
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, is_system = EXCLUDED.is_system;`;
if (!sql.includes(rolesBefore)) throw new Error("Role seed block not found");
sql = sql.replace(rolesBefore, rolesAfter);
sql = sql.replace(
  `SELECT '00000000-0000-0000-0000-000000000001', id FROM permissions`,
  `SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.code = 'ADMIN'`,
);
sql = sql.replace(
  `SELECT '00000000-0000-0000-0000-000000000002', id
FROM permissions WHERE code IN (`,
  `SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.code = 'STAFF' AND p.code IN (`,
);
sql = sql.replace(
  `INSERT INTO user_roles (user_id, role_id)
VALUES ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;`,
  `INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u CROSS JOIN roles r
WHERE u.id = '00000000-0000-0000-0000-000000000010' AND r.code = 'ADMIN'
ON CONFLICT DO NOTHING;`,
);
writeFileSync(path, sql, "utf8");
