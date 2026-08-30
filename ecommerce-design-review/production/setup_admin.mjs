import pg from 'pg';
import { pbkdf2 as pbkdf2Callback, randomBytes } from 'node:crypto';
import { promisify } from 'node:util';

const pbkdf2 = promisify(pbkdf2Callback);

async function hashPassword(password) {
  const salt = randomBytes(16);
  const digest = await pbkdf2(password, salt, 210_000, 32, 'sha256');
  return `pbkdf2-sha256$210000$${salt.toString('base64url')}$${digest.toString('base64url')}`;
}

const ADMIN_EMAIL = 'admin@ananshop.vn';
const ADMIN_PASSWORD = 'AnAnAdmin@2026';
const ADMIN_NAME = 'An An Admin';

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

console.log('🔧 Tạo các bảng còn thiếu...');

// Tạo auth_tokens table
await client.query(`
  CREATE TABLE IF NOT EXISTS auth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`);

// Tạo roles table
await client.query(`
  CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`);

// Tạo user_roles table
await client.query(`
  CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
  )
`);

// Tạo permissions table
await client.query(`
  CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`);

// Tạo role_permissions table
await client.query(`
  CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
  )
`);

console.log('✅ Các bảng đã được tạo');

// Seed roles
await client.query(`
  INSERT INTO roles (code, name) VALUES
    ('ADMIN', 'Quản trị viên'),
    ('STAFF', 'Nhân viên'),
    ('CUSTOMER', 'Khách hàng')
  ON CONFLICT (code) DO NOTHING
`);
console.log('✅ Roles đã được seed');

// Tạo admin user
const passwordHash = await hashPassword(ADMIN_PASSWORD);
const adminId = crypto.randomUUID();

const existing = await client.query(`SELECT id FROM users WHERE email = $1`, [ADMIN_EMAIL]);
let userId = existing.rows[0]?.id;

if (!userId) {
  const result = await client.query(`
    INSERT INTO users (id, email, password_hash, full_name, status, email_verified_at)
    VALUES ($1, $2, $3, $4, 'ACTIVE', NOW())
    RETURNING id
  `, [adminId, ADMIN_EMAIL, passwordHash, ADMIN_NAME]);
  userId = result.rows[0].id;
  console.log('✅ Admin user đã được tạo:', ADMIN_EMAIL);
} else {
  // Update password
  await client.query(`UPDATE users SET password_hash = $1, status = 'ACTIVE' WHERE id = $2`, [passwordHash, userId]);
  console.log('✅ Admin user đã cập nhật password:', ADMIN_EMAIL);
}

// Gán role ADMIN
await client.query(`
  INSERT INTO user_roles (user_id, role_id)
  SELECT $1::uuid, id FROM roles WHERE code = 'ADMIN'
  ON CONFLICT DO NOTHING
`, [userId]);
console.log('✅ Đã gán role ADMIN');

await client.end();

console.log('\n🎉 HOÀN THÀNH! Thông tin đăng nhập admin:');
console.log('   Email   :', ADMIN_EMAIL);
console.log('   Password:', ADMIN_PASSWORD);
console.log('   URL     : https://production-eight-omega.vercel.app/admin/login');
