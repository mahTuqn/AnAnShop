# Ma trận truy vết yêu cầu — An An Shop

## Quy ước

- **P0**: bắt buộc trước khi phát hành; **P1**: cần cho vận hành đầy đủ; **P2**: tối ưu sau MVP.
- API ghi `planned` là hợp đồng cần Agent Platform hiện thực. Frontend không được thay thế kiểm tra quyền, giá, voucher hoặc tồn kho ở server.
- Các test ID trỏ tới spec Playwright trong `production/tests/e2e` hoặc nhóm test integration/unit cần bổ sung.

## Storefront và tài khoản

| ID | Ưu tiên | Use case | Page | API/hợp đồng | Bảng dữ liệu chính | Test |
|---|---|---|---|---|---|---|
| SF-01 | P0 | Xem danh sách, lọc, sắp xếp, phân trang | `/products`, `/search` | `GET /api/catalog/products` | `products`, `product_variants`, `categories`, `facet_*`, `inventory_items` | `storefront-p0.spec.ts` — `SF-01` |
| SF-02 | P0 | Xem chi tiết và chọn biến thể | `/products/[slug]` | `GET /api/catalog/products/[slug]` | `products`, `product_images`, `product_options`, `product_option_values`, `product_variants`, `inventory_items` | `storefront-p0.spec.ts` — `SF-02` |
| SF-03 | P0 | Quản lý giỏ hàng khách/thành viên | `/cart` | `GET/POST/PATCH/DELETE /api/cart` | `carts`, `cart_items`, `product_variants`, `inventory_items` | `storefront-p0.spec.ts` — `SF-03` |
| SF-04 | P0 | Checkout và tính lại giá phía server | `/checkout` | `POST /api/checkout/quote`, `POST /api/orders` | `orders`, `order_addresses`, `order_items`, `inventory_items`, `inventory_movements` | `storefront-p0.spec.ts` — `SF-04`; integration checkout transaction |
| SF-05 | P0 | Áp dụng voucher | `/checkout` | `POST /api/checkout/quote` | `coupons`, `coupon_products`, `coupon_categories`, `coupon_redemptions`, `order_coupons` | integration voucher valid/expired/limit |
| SF-06 | P0 | COD và thanh toán online | `/checkout`, `/payment/[status]` | `POST /api/payments`, `POST /api/webhooks/payments/[provider]` | `payments`, `payment_events`, `orders` | integration signature/idempotency; E2E COD |
| SF-07 | P0 | Đăng ký, xác minh, đăng nhập, đặt lại mật khẩu | `/register`, `/verify-email`, `/login`, `/forgot-password`, `/reset-password` | `/api/auth/*` | `users`, `auth_tokens`, session tables của auth adapter | `storefront-p0.spec.ts` — `SF-07`; auth rate-limit tests |
| SF-08 | P0 | Lịch sử, chi tiết, tra cứu và hủy đơn | `/account/orders`, `/account/orders/[code]`, `/track-order` | `GET/PATCH /api/orders/*` | `orders`, `order_items`, `shipments`, `shipment_events`, `payments` | E2E member/guest ownership và invalid transition |
| SF-09 | P1 | Hồ sơ và sổ địa chỉ | `/account/profile`, `/account/addresses` | `GET/PATCH /api/account`, `/api/account/addresses` | `users`, `addresses` | integration default-address uniqueness |
| SF-10 | P1 | Wishlist và đồng bộ sau đăng nhập | `/wishlist` | `GET/POST/DELETE /api/wishlist` | `wishlists`, `wishlist_items` | E2E guest merge, duplicate idempotency |
| SF-11 | P1 | Đánh giá từ đơn đã mua | `/account/reviews`, PDP | `POST /api/reviews` | `reviews`, `review_images`, `order_items` | integration verified purchase/rating range |
| SF-12 | P1 | Yêu cầu đổi trả | `/account/orders/[code]/return` | `POST /api/returns` | `return_requests`, `return_items`, `orders`, `order_items` | integration return window/quantity |
| SF-13 | P1 | Nội dung, FAQ, chính sách, cẩm nang | `/about`, `/faq`, `/policy`, `/journal/[slug]` | `GET /api/content/*` hoặc server data access | `content_entries` | smoke pages + SEO metadata |

## Backoffice

| ID | Ưu tiên | Use case | Page | API/hợp đồng dự kiến | Bảng dữ liệu chính | Test |
|---|---|---|---|---|---|---|
| AD-01 | P0 | Xem dashboard vận hành | `/admin` | `GET /api/admin/dashboard` | `orders`, `payments`, `users`, `inventory_items`, `reviews` | `admin-p0.spec.ts` — dashboard |
| AD-02 | P0 | Lọc, xem và cập nhật đơn | `/admin/orders` | `GET /api/admin/orders`, `GET/PATCH /api/admin/orders/[id]` | `orders`, `order_items`, `order_addresses`, `payments`, `shipments` | `admin-p0.spec.ts` — search/detail; integration transition/authz |
| AD-03 | P0 | Tạo/sửa sản phẩm, ảnh và biến thể | `/admin/products` | CRUD `/api/admin/products` | `products`, `product_images`, `product_options`, `product_option_values`, `product_variants`, `variant_option_values` | `admin-p0.spec.ts` — create form; contract duplicate SKU |
| AD-04 | P1 | Quản lý danh mục, facet | `/admin/categories` | CRUD `/api/admin/categories`, `/facets` | `categories`, `facet_definitions`, `facet_values`, `product_facet_values` | `admin-p0.spec.ts` — filter/detail; cycle/slug test |
| AD-05 | P0 | Kiểm kê và điều chỉnh tồn | `/admin/inventory` | `GET /api/admin/inventory`, `POST /api/admin/inventory/[id]/adjust` | `inventory_items`, `inventory_movements`, `product_variants` | `admin-p0.spec.ts` — low stock; integration row lock/nonnegative |
| AD-06 | P1 | Xem/khóa tài khoản khách hàng | `/admin/customers` | `GET/PATCH /api/admin/customers/[id]` | `users`, `addresses`, `orders`, `reviews` | authz + PII redaction tests |
| AD-07 | P0 | Tạo và quản lý voucher | `/admin/promotions` | CRUD `/api/admin/promotions` | `coupons`, `coupon_products`, `coupon_categories`, `coupon_redemptions` | `admin-p0.spec.ts` — create; time/usage boundary tests |
| AD-08 | P1 | Duyệt/từ chối đánh giá | `/admin/reviews` | `GET /api/admin/reviews`, `PATCH /api/admin/reviews/[id]` | `reviews`, `review_images`, `users`, `products` | `admin-p0.spec.ts` — moderation detail; authz |
| AD-09 | P1 | Soạn/xuất bản nội dung | `/admin/content` | CRUD `/api/admin/content` | `content_entries`, `users` | draft/publish/schedule tests |
| AD-10 | P1 | Báo cáo và xuất CSV | `/admin/reports` | `GET /api/admin/reports/*` | `orders`, `order_items`, `payments`, `refunds`, `inventory_items` | `admin-p0.spec.ts` — period; totals reconcile SQL |
| AD-11 | P0 | Cấu hình cửa hàng | `/admin/settings` | `GET/PATCH /api/admin/settings` (planned; cần persistence store) | **Thiếu bảng `store_settings` trong schema hiện tại**; `audit_logs` | `admin-p0.spec.ts` — save; authz/audit integration |
| AD-12 | P0 | Xem audit log | `/admin/audit` | `GET /api/admin/audit` | `audit_logs`, `users` | `admin-p0.spec.ts` — filter/detail; immutability/authz |
| AD-13 | P0 | Vai trò và quyền nhân viên | `/admin/staff`, `/admin/access` (implemented UI) | CRUD `/api/admin/staff`, `/api/admin/roles` | `users`, `roles`, `permissions`, `user_roles`, `role_permissions` | server-side RBAC deny/allow matrix |
| AD-14 | P0 | Xử lý đổi trả/hoàn tiền | `/admin/returns` (implemented UI) | `PATCH /api/admin/returns/[id]`, `POST /api/admin/refunds` | `return_requests`, `return_items`, `refunds`, `payments`, `inventory_movements` | transaction/idempotency E2E integration |

## Lỗ hổng truy vết cần manager xử lý

1. Schema chưa có bảng lưu cấu hình cửa hàng (`store_settings`) dù use case và page cài đặt đã tồn tại.
2. Production đã có page UI quản lý nhân viên, RBAC, đổi trả/hoàn tiền; API và persistence còn cần hoàn thiện; đây là P0 về vận hành và an toàn.
3. `activity-diagram.mermaid` đang mô tả tạo payment trước order, trái với FK `payments.order_id NOT NULL`. Luồng chuẩn phải tạo order `PENDING` + snapshot + reservation trong transaction trước, sau đó tạo payment.
4. `class-diagram.mermaid` dùng `User.role` đơn trị trong khi schema dùng RBAC nhiều-nhiều. `admin-domain-class-diagram.mermaid` bổ sung mô hình đúng theo schema.
5. `database-erd.mermaid` là ERD rút gọn, không thể dùng làm migration source; `database/schema.sql` mới là nguồn chuẩn.

