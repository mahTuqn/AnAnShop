-- Seed dữ liệu khởi tạo cho hệ thống An An Shop
-- Chạy sau schema.sql
-- psql "$DATABASE_URL" -f database/seed.sql

BEGIN;

-- ── Roles & Permissions ────────────────────────────────────────────────────
INSERT INTO permissions (id, code, name) VALUES
  (gen_random_uuid(), 'orders.read',      'Xem đơn hàng'),
  (gen_random_uuid(), 'orders.write',     'Cập nhật đơn hàng'),
  (gen_random_uuid(), 'products.read',    'Xem sản phẩm'),
  (gen_random_uuid(), 'products.write',   'Quản lý sản phẩm'),
  (gen_random_uuid(), 'inventory.read',   'Xem tồn kho'),
  (gen_random_uuid(), 'inventory.write',  'Điều chỉnh tồn kho'),
  (gen_random_uuid(), 'customers.read',   'Xem khách hàng'),
  (gen_random_uuid(), 'customers.write',  'Quản lý khách hàng'),
  (gen_random_uuid(), 'promotions.read',  'Xem khuyến mãi'),
  (gen_random_uuid(), 'promotions.write', 'Quản lý khuyến mãi'),
  (gen_random_uuid(), 'reviews.read',     'Xem đánh giá'),
  (gen_random_uuid(), 'reviews.write',    'Duyệt đánh giá'),
  (gen_random_uuid(), 'staff.read',       'Xem nhân viên'),
  (gen_random_uuid(), 'staff.write',      'Quản lý nhân viên'),
  (gen_random_uuid(), 'reports.read',     'Xem báo cáo'),
  (gen_random_uuid(), 'settings.read',    'Xem cài đặt'),
  (gen_random_uuid(), 'settings.write',   'Cập nhật cài đặt'),
  (gen_random_uuid(), 'audit.read',       'Xem audit log'),
  (gen_random_uuid(), 'content.read',     'Xem nội dung và banner'),
  (gen_random_uuid(), 'content.write',    'Quản lý nội dung và banner')
ON CONFLICT (code) DO NOTHING;

INSERT INTO roles (code, name, is_system) VALUES
  ('ADMIN', 'Quản trị viên', TRUE),
  ('CUSTOMER', 'Khách hàng', TRUE),
  ('STAFF', 'Nhân viên', FALSE)
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, is_system = EXCLUDED.is_system;

-- Admin has all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.code = 'ADMIN'
ON CONFLICT DO NOTHING;

-- Staff has operational permissions (no staff.write, settings.write, audit.read)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.code = 'STAFF' AND p.code IN (
  'orders.read','orders.write','products.read','products.write',
  'inventory.read','inventory.write','customers.read','promotions.read',
  'reviews.read','reviews.write','reports.read','content.read'
)
ON CONFLICT DO NOTHING;

-- ── Admin user ─────────────────────────────────────────────────────────────
-- Tài khoản mẫu bị BLOCKED; không dùng credential seed trong staging/production.
INSERT INTO users (id, email, full_name, password_hash, status)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  'admin@ananshop.vn',
  'An An Admin',
  '$argon2id$v=19$m=65536,t=3,p=4$pEACkYt+U73C4Es3LAar5g$QCnn5VSRvKZQzXYVumBI8UVwpljc96bEhM8AXCfZTHY',
  'BLOCKED'
) ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u CROSS JOIN roles r
WHERE u.id = '00000000-0000-0000-0000-000000000010' AND r.code = 'ADMIN'
ON CONFLICT DO NOTHING;

-- ── Store settings defaults ────────────────────────────────────────────────
INSERT INTO store_settings (key, value, description, is_public) VALUES
  ('store.name',          '"An An Shop"',              'Tên cửa hàng', TRUE),
  ('store.email',         '"hello@ananshop.vn"',       'Email liên hệ', TRUE),
  ('store.phone',         '"1900 6868"',               'Hotline', TRUE),
  ('store.address',       '"18 Võ Văn Tần, Quận 3, TP.HCM"', 'Địa chỉ', TRUE),
  ('shipping.free_threshold', '699000',                'Miễn phí vận chuyển từ (VND)', TRUE),
  ('shipping.standard_fee',   '30000',                 'Phí giao hàng tiêu chuẩn (VND)', TRUE),
  ('shipping.express_fee',    '45000',                 'Phí giao hàng nhanh (VND)', TRUE),
  ('return.days',             '14',                    'Số ngày được đổi trả', TRUE)
ON CONFLICT (key) DO NOTHING;

-- ── Sample categories ─────────────────────────────────────────────────────
INSERT INTO categories (id, name, slug, position, active) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Đồ bầu',              'do-bau',       1, TRUE),
  ('10000000-0000-0000-0000-000000000002', 'Sau sinh & cho bú',   'sau-sinh',     2, TRUE),
  ('10000000-0000-0000-0000-000000000003', 'Đồ sơ sinh',          'do-so-sinh',   3, TRUE),
  ('10000000-0000-0000-0000-000000000004', 'Phụ kiện',            'phu-kien',     4, TRUE),
  ('10000000-0000-0000-0000-000000000005', 'Combo quà tặng',      'combo-qua-tang', 5, TRUE)
ON CONFLICT (slug) DO NOTHING;

COMMIT;
