BEGIN;

INSERT INTO permissions (code, name)
VALUES ('audit.read', 'Xem nhật ký kiểm toán')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.code = 'ADMIN' AND p.code = 'audit.read'
ON CONFLICT DO NOTHING;

COMMIT;

