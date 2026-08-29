import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");

function update(relativePath, transform) {
  const path = resolve(root, relativePath);
  const before = readFileSync(path, "utf8");
  const after = transform(before);
  if (before === after) throw new Error(`No integration change applied to ${relativePath}`);
  writeFileSync(path, after, "utf8");
  process.stdout.write(`integrated ${relativePath}\n`);
}

function replaceExact(source, from, to, label) {
  if (!source.includes(from)) throw new Error(`Missing expected content: ${label}`);
  return source.replace(from, to);
}

update("production/src/modules/payment/index.ts", (source) => {
  source = replaceExact(source, 'import { AppError, Result, err, ok, uuid } from "../shared";', 'import { AppError, Result, err, ok } from "../shared";', "payment uuid import");
  return replaceExact(source, 'paymentId: uuid("pay")', 'paymentId: `pay_${order.id}`', "deterministic payment id");
});

update("production/src/modules/shared/index.ts", (source) => replaceExact(
  source,
  'export function uuid(prefix = "id"): string {\n  return `${prefix}_${crypto.randomUUID()}`;\n}',
  'export function uuid(_prefix = "id"): string {\n  return crypto.randomUUID();\n}',
  "database-compatible UUID",
));

update("production/prisma/schema.prisma", (source) => {
  const enums = `enum UserStatus {\n  PENDING_VERIFICATION\n  ACTIVE\n  BLOCKED\n  @@map("user_status")\n}\n\nenum ProductStatus {\n  DRAFT\n  ACTIVE\n  ARCHIVED\n  @@map("product_status")\n}\n\nenum CartStatus {\n  ACTIVE\n  CONVERTED\n  ABANDONED\n  @@map("cart_status")\n}\n\nenum OrderStatus {\n  PENDING\n  CONFIRMED\n  PROCESSING\n  SHIPPING\n  DELIVERED\n  CANCELLED\n  RETURN_REQUESTED\n  RETURNED\n  @@map("order_status")\n}\n\nenum PaymentMethod {\n  COD\n  MOMO\n  VNPAY\n  CARD\n  @@map("payment_method")\n}\n\nenum PaymentStatus {\n  PENDING\n  AUTHORIZED\n  PAID\n  FAILED\n  CANCELLED\n  PARTIALLY_REFUNDED\n  REFUNDED\n  @@map("payment_status")\n}\n\nenum DiscountType {\n  PERCENTAGE\n  FIXED_AMOUNT\n  FREE_SHIPPING\n  @@map("discount_type")\n}\n\nenum CouponScope {\n  ORDER\n  PRODUCT\n  CATEGORY\n  @@map("coupon_scope")\n}\n\nenum InventoryMovementType {\n  PURCHASE\n  SALE\n  RETURN\n  ADJUSTMENT\n  RESERVE\n  RELEASE\n  @@map("inventory_movement_type")\n}`;
  const enumPattern = /enum UserStatus[^\n]+\nenum ProductStatus[^\n]+\nenum CartStatus[^\n]+\nenum OrderStatus[^\n]+\nenum PaymentMethod[^\n]+\nenum PaymentStatus[^\n]+\nenum DiscountType[^\n]+\nenum CouponScope[^\n]+\nenum InventoryMovementType[^\n]+/;
  if (!enumPattern.test(source)) throw new Error("Missing one-line Prisma enums");
  source = source.replace(enumPattern, enums);
  source = replaceExact(source, '  providerPayload       Json          @default("{}") @map("provider_payload")\n  failureCode           String?       @map("failure_code") @db.VarChar(100)\n  failureMessage        String?       @map("failure_message")', '  metadata              Json          @default("{}")\n  failedAt              DateTime?     @map("failed_at") @db.Timestamptz(6)\n  failureReason         String?       @map("failure_reason")', "payment mapping");
  return source;
});

update("production/vitest.config.ts", (source) => replaceExact(
  source,
  'include: ["tests/**/*.{test,spec}.{ts,tsx}"],',
  'include: ["tests/{unit,integration}/**/*.{test,spec}.{ts,tsx}"],\n    exclude: ["tests/e2e/**"],',
  "Vitest suite boundary",
));

update("production/next.config.ts", (source) => replaceExact(
  source,
  "const nextConfig: NextConfig = {\n",
  "const nextConfig: NextConfig = {\n  turbopack: { root: process.cwd() },\n",
  "Turbopack root",
));

update("production/src/components/admin/resource-page.tsx", (source) => replaceExact(
  source,
  'role="dialog" aria-modal="true" aria-labelledby="detail-title"',
  'role="dialog" aria-modal="true" aria-label="Chi tiết"',
  "admin detail accessible name",
));

update("production/tests/e2e/admin-p0.spec.ts", (source) => replaceExact(
  source,
  'page.getByText("Quý này")',
  'page.locator("p", { hasText: /^Quý này$/ })',
  "reports locator",
));

update("docs/diagrams/activity-diagram.mermaid", (source) => {
  source = source.replace(/    createOrder\[[^\n]+\]/, '    createOrder["Tạo đơn hàng PENDING"]\n    confirmOrder["Xác nhận đơn hàng"]');
  source = replaceExact(source, "confirm --> reserveStock --> onlinePayment", "confirm --> reserveStock --> createOrder --> onlinePayment", "order before payment");
  source = replaceExact(source, 'onlinePayment -->|"Không"| createOrder', 'onlinePayment -->|"Không"| confirmOrder', "COD confirmation");
  source = replaceExact(source, 'paymentSuccess -->|"Có"| createOrder', 'paymentSuccess -->|"Có"| confirmOrder', "online confirmation");
  return replaceExact(source, "createOrder --> notify", "confirmOrder --> notify", "confirmation notification");
});

update("production/src/lib/admin/admin-data.ts", (source) => replaceExact(
  source,
  '["/admin/promotions", "Khuyến mãi"], ["/admin/reviews", "Đánh giá"], ["/admin/content", "Nội dung"],',
  '["/admin/promotions", "Khuyến mãi"], ["/admin/returns", "Đổi trả"], ["/admin/reviews", "Đánh giá"], ["/admin/content", "Nội dung"],\n  ["/admin/staff", "Nhân viên"], ["/admin/access", "Vai trò & quyền"],',
  "admin navigation",
));

update("docs/traceability-matrix.md", (source) => {
  source = replaceExact(source, '`/admin/staff`, `/admin/access` (planned)', '`/admin/staff`, `/admin/access` (implemented UI)', "staff page status");
  source = replaceExact(source, '`/admin/returns` (planned)', '`/admin/returns` (implemented UI)', "returns page status");
  return source.replace("Production chưa có page/API quản lý nhân viên, RBAC, đổi trả/hoàn tiền", "Production đã có page UI quản lý nhân viên, RBAC, đổi trả/hoàn tiền; API và persistence còn cần hoàn thiện");
});

update("production/src/app/globals.css", (source) => `${source.trimEnd()}\n\n.control {\n  margin-top: 0.375rem;\n  min-height: 2.75rem;\n  width: 100%;\n  border: 1px solid #cbd5e1;\n  border-radius: 0.75rem;\n  padding-inline: 0.75rem;\n}\n`);

for (const page of ["login", "register", "forgot-password", "reset-password"]) {
  update(`production/src/app/(auth)/${page}/page.tsx`, (source) => replaceExact(source, 'import { AuthForm } from "@/components/storefront/auth-form";', 'import { AuthFormIntegrated as AuthForm } from "@/components/storefront/auth-form-integrated";', `integrated auth ${page}`));
}

update("production/src/app/(storefront)/products/[slug]/page.tsx", (source) => {
  source = replaceExact(source, 'import { ProductDetail } from "@/components/storefront/product-detail";', 'import { ProductDetailIntegrated as ProductDetail } from "@/components/storefront/product-detail-integrated";', "integrated product detail");
  return replaceExact(source, 'import { getProduct } from "@/lib/storefront/adapters";', 'import { getProduct } from "@/lib/storefront/adapters-integrated";', "integrated product adapter");
});

update("production/src/app/(storefront)/cart/page.tsx", (source) => replaceExact(source, 'import { CartClient } from "@/components/storefront/cart-client";', 'import { CartClientIntegrated as CartClient } from "@/components/storefront/cart-client-integrated";', "integrated cart"));
update("production/src/app/(storefront)/checkout/page.tsx", (source) => replaceExact(source, 'import { CheckoutClient } from "@/components/storefront/checkout-client";', 'import { CheckoutClientIntegrated as CheckoutClient } from "@/components/storefront/checkout-client-integrated";', "integrated checkout"));
update("production/src/app/(storefront)/account/orders/[code]/page.tsx", (source) => replaceExact(source, 'import { getOrder } from "@/lib/storefront/adapters";', 'import { getOrder } from "@/lib/storefront/adapters-integrated";', "integrated order adapter"));
