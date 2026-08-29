BEGIN;

INSERT INTO permissions(code,name) VALUES
  ('content.read','Xem nội dung và banner'),
  ('content.write','Quản lý nội dung và banner')
ON CONFLICT(code) DO UPDATE SET name=EXCLUDED.name;

INSERT INTO role_permissions(role_id,permission_id)
SELECT r.id,p.id FROM roles r CROSS JOIN permissions p
WHERE r.code='ADMIN' AND p.code IN ('content.read','content.write')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions(role_id,permission_id)
SELECT r.id,p.id FROM roles r CROSS JOIN permissions p
WHERE r.code='STAFF' AND p.code='content.read'
ON CONFLICT DO NOTHING;

COMMIT;
