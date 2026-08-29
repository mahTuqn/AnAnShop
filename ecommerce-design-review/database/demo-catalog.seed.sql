-- Idempotent local/demo catalog. Do not treat these rows as production merchandise.
BEGIN;

INSERT INTO products (id, category_id, name, slug, short_description, description, material, status, featured, published_at) VALUES
  ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Đầm bầu linen An Nhiên', 'dam-bau-linen-an-nhien', 'Đầm linen dáng suông thoáng mát cho mẹ bầu.', 'Thiết kế linh hoạt theo từng giai đoạn thai kỳ, có khóa kéo cho con bú.', 'Linen pha cotton', 'ACTIVE', TRUE, NOW()),
  ('50000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', 'Bộ body sơ sinh Mây Nhỏ', 'bo-body-so-sinh-may-nho', 'Body cotton mềm dịu cho làn da nhạy cảm của bé.', 'Khuy bấm an toàn, đường may phẳng, phù hợp bé 0–6 tháng.', 'Cotton hữu cơ', 'ACTIVE', TRUE, NOW()),
  ('50000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'Áo cho bú Modal Dịu Êm', 'ao-cho-bu-modal-diu-em', 'Áo modal co giãn với lớp mở kín đáo.', 'Phom thoải mái dùng trong thai kỳ và sau sinh.', 'Modal', 'ACTIVE', FALSE, NOW())
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, short_description = EXCLUDED.short_description,
  description = EXCLUDED.description, material = EXCLUDED.material,
  status = EXCLUDED.status, featured = EXCLUDED.featured, published_at = EXCLUDED.published_at;

INSERT INTO product_images (id, product_id, url, alt_text, position) VALUES
  ('51000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1596783074918-c84cb06531ca?auto=format&fit=crop&w=900&q=80', 'Đầm bầu linen màu be', 0),
  ('51000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', 'https://images.unsplash.com/photo-1522771930-78848d9293e8?auto=format&fit=crop&w=900&q=80', 'Bộ body cotton cho trẻ sơ sinh', 0),
  ('51000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000003', 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=900&q=80', 'Áo modal cho mẹ sau sinh', 0)
ON CONFLICT (product_id, position) DO UPDATE SET url = EXCLUDED.url, alt_text = EXCLUDED.alt_text;

INSERT INTO product_variants (id, product_id, sku, price, compare_at_price, weight_grams, active) VALUES
  ('52000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'AN-NHIEN-M', 689000, 759000, 420, TRUE),
  ('52000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', 'AN-NHIEN-L', 689000, 759000, 440, TRUE),
  ('52000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000002', 'MAY-NHO-0-3M', 289000, NULL, 180, TRUE),
  ('52000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000002', 'MAY-NHO-3-6M', 289000, NULL, 200, TRUE),
  ('52000000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000003', 'DIU-EM-M', 429000, 479000, 260, TRUE)
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, compare_at_price = EXCLUDED.compare_at_price, weight_grams = EXCLUDED.weight_grams, active = EXCLUDED.active;

INSERT INTO inventory_items (id, variant_id, on_hand, reserved, low_stock_level) VALUES
  ('53000000-0000-0000-0000-000000000001', '52000000-0000-0000-0000-000000000001', 24, 0, 5),
  ('53000000-0000-0000-0000-000000000002', '52000000-0000-0000-0000-000000000002', 18, 0, 5),
  ('53000000-0000-0000-0000-000000000003', '52000000-0000-0000-0000-000000000003', 36, 0, 8),
  ('53000000-0000-0000-0000-000000000004', '52000000-0000-0000-0000-000000000004', 28, 0, 8),
  ('53000000-0000-0000-0000-000000000005', '52000000-0000-0000-0000-000000000005', 16, 0, 5)
ON CONFLICT (variant_id) DO UPDATE SET on_hand = EXCLUDED.on_hand, low_stock_level = EXCLUDED.low_stock_level;

COMMIT;
