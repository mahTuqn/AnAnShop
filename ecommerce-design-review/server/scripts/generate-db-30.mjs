import pg from "pg";
import argon2 from "argon2";
import { v4 as uuid } from "uuid";
import "dotenv/config";

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/ananshop",
});

async function run() {
  console.log("Xóa dữ liệu cũ...");
  await pool.query(`
    TRUNCATE TABLE 
      users, roles, permissions, user_roles, role_permissions, 
      store_settings, categories, products, product_images, product_variants, 
      inventory_items, inventory_movements, carts, cart_items, 
      orders, order_items, order_addresses, payments, shipments, shipment_events, 
      coupons, coupon_redemptions, order_coupons, return_requests, return_items, refunds,
      addresses, wishlists, wishlist_items, reviews, audit_logs
    CASCADE;
  `);

  console.log("Tạo Roles & Permissions...");
  const perms = [
    'orders.read', 'orders.write', 'products.read', 'products.write',
    'inventory.read', 'inventory.write', 'customers.read', 'customers.write',
    'promotions.read', 'promotions.write', 'reviews.read', 'reviews.write',
    'staff.read', 'staff.write', 'reports.read', 'settings.read',
    'settings.write', 'audit.read'
  ];
  for (const p of perms) {
    await pool.query(`INSERT INTO permissions (id, code, name) VALUES ($1, $2, $3)`, [uuid(), p, p]);
  }

  const roleAdminId = '00000000-0000-0000-0000-000000000001';
  await pool.query(`INSERT INTO roles (id, code, name, is_system) VALUES ($1, 'ADMIN', 'Quản trị viên', TRUE)`, [roleAdminId]);
  
  await pool.query(`
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT $1, id FROM permissions
  `, [roleAdminId]);

  console.log("Tạo tài khoản...");
  const hashAdmin = await argon2.hash("Admin@2026");
  const hashUser1 = await argon2.hash("Khachhang123");
  const hashUser2 = await argon2.hash("Khachhang456");

  const adminId = '00000000-0000-0000-0000-000000000010';
  await pool.query(`INSERT INTO users (id, email, full_name, password_hash, status) VALUES ($1, $2, $3, $4, 'ACTIVE')`, 
    [adminId, 'admin@ananshop.vn', 'Quản trị viên', hashAdmin]);
  await pool.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`, [adminId, roleAdminId]);

  const user1Id = uuid();
  await pool.query(`INSERT INTO users (id, email, phone, full_name, password_hash, status) VALUES ($1, $2, $3, $4, $5, 'ACTIVE')`, 
    [user1Id, 'khachhang1@gmail.com', '0901234567', 'Nguyễn Văn Khách', hashUser1]);

  const user2Id = uuid();
  await pool.query(`INSERT INTO users (id, email, phone, full_name, password_hash, status) VALUES ($1, $2, $3, $4, $5, 'ACTIVE')`, 
    [user2Id, 'khachhang2@gmail.com', '0912345678', 'Trần Thị Mua', hashUser2]);

  console.log("Tạo cài đặt...");
  await pool.query(`INSERT INTO store_settings (key, value, description, is_public) VALUES 
    ('store.name', '"An An Shop"', 'Tên cửa hàng', TRUE),
    ('shipping.free_threshold', '699000', 'Freeship', TRUE)
  `);

  console.log("Tạo danh mục và 30 sản phẩm...");
  const catMaternityId = uuid();
  const catBabyId = uuid();
  await pool.query(`INSERT INTO categories (id, name, slug, position, active) VALUES 
    ($1, 'Đồ bầu', 'do-bau', 1, TRUE),
    ($2, 'Đồ sơ sinh', 'do-so-sinh', 2, TRUE)
  `, [catMaternityId, catBabyId]);

  const materials = ['Linen', 'Cotton hữu cơ', 'Modal', 'Spandex'];
  const images = [
    'https://images.unsplash.com/photo-1596783074918-c84cb06531ca?w=900&q=80',
    'https://images.unsplash.com/photo-1522771930-78848d9293e8?w=900&q=80',
    'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=900&q=80',
    'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=900&q=80',
    'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=900&q=80',
    'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=900&q=80'
  ];

  for (let i = 1; i <= 30; i++) {
    const isMaternity = i <= 15;
    const catId = isMaternity ? catMaternityId : catBabyId;
    const name = isMaternity ? `Đầm bầu cao cấp An An ${i}` : `Bộ đồ sơ sinh an toàn ${i}`;
    const slug = `san-pham-${i}`;
    const prodId = uuid();
    
    await pool.query(`
      INSERT INTO products (id, category_id, name, slug, short_description, description, material, status, featured, published_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE', $8, NOW())
    `, [
      prodId, catId, name, slug, 
      `Mô tả ngắn cho sản phẩm ${name}`,
      `Mô tả chi tiết và đầy đủ thông tin cho ${name}, giúp mang lại sự thoải mái nhất.`,
      materials[i % materials.length],
      i % 5 === 0
    ]);

    const varId = uuid();
    const price = 200000 + (i * 10000);
    const compare = price + 50000;
    
    await pool.query(`
      INSERT INTO product_variants (id, product_id, sku, price, compare_at_price, active)
      VALUES ($1, $2, $3, $4, $5, TRUE)
    `, [varId, prodId, `SKU-${i}`, price, compare]);

    const invId = uuid();
    await pool.query(`
      INSERT INTO inventory_items (id, variant_id, on_hand, reserved, low_stock_level)
      VALUES ($1, $2, $3, 0, 5)
    `, [invId, varId, 50 + i]);

    const imgUrl = images[i % images.length];
    await pool.query(`
      INSERT INTO product_images (id, product_id, url, alt_text, position)
      VALUES ($1, $2, $3, $4, 0)
    `, [uuid(), prodId, imgUrl, name]);
  }

  console.log("Hoàn tất tạo 30 sản phẩm và tài khoản!");
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
