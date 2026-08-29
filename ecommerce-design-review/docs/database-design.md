# Thiết kế cơ sở dữ liệu An An Shop

## 1. Nền tảng và phạm vi

- Hệ quản trị: PostgreSQL 15 trở lên.
- Khóa chính nghiệp vụ: UUID sinh bằng `gen_random_uuid()`.
- Thời gian: `TIMESTAMPTZ`, lưu UTC và chuyển sang múi giờ người dùng ở tầng ứng dụng.
- Tiền: `NUMERIC(14,2)` và mã tiền tệ ISO 4217; mặc định `VND`.
- DDL chính: [`database/schema.sql`](../database/schema.sql).
- Dữ liệu nền: [`database/seed.sql`](../database/seed.sql).
- ERD: [`docs/diagrams/database-erd.mermaid`](diagrams/database-erd.mermaid).

Schema phục vụ storefront, tài khoản khách hàng, quản trị, thanh toán, vận chuyển, đổi trả, CMS và audit. Dữ liệu thẻ ngân hàng không được lưu trong hệ thống.

## 2. Các bounded context

| Domain | Bảng chính | Trách nhiệm |
|---|---|---|
| Identity | `users`, `roles`, `permissions`, `auth_tokens`, `addresses` | Đăng ký, xác minh, phân quyền và địa chỉ |
| Catalog | `categories`, `products`, `product_images` | Nội dung và phân loại sản phẩm |
| Variants | `product_options`, `product_option_values`, `product_variants` | Size, màu, SKU và giá bán |
| Facets | `facet_definitions`, `facet_values`, `product_facet_values` | Bộ lọc thai kỳ, độ tuổi bé và chất liệu |
| Inventory | `inventory_items`, `inventory_movements` | Tồn thực tế, tồn giữ và lịch sử điều chỉnh |
| Cart | `carts`, `cart_items` | Giỏ khách vãng lai và thành viên |
| Promotion | `coupons`, bảng phạm vi và redemption | Điều kiện, giới hạn và lịch sử sử dụng mã |
| Order | `orders`, `order_addresses`, `order_items`, `order_coupons` | Snapshot giao dịch và vòng đời đơn |
| Payment | `payments`, `payment_events`, `refunds` | COD, MoMo, VNPay, thẻ và webhook |
| Fulfillment | `shipments`, `shipment_events` | Mã vận đơn và timeline vận chuyển |
| Returns | `return_requests`, `return_items` | Đổi trả và hoàn tiền |
| Engagement | `wishlists`, `reviews`, `notifications` | Yêu thích, đánh giá và thông báo |
| CMS/Audit | `content_entries`, `audit_logs` | Trang nội dung, bài viết và nhật ký quản trị |

## 3. Quyết định thiết kế quan trọng

### Product và variant

`products` chứa thông tin chung. Mỗi tổ hợp size–màu là một `product_variant` có SKU, giá và tồn kho riêng. Một variant chỉ nhận tối đa một giá trị cho mỗi option nhờ khóa chính `(variant_id, option_id)`.

Thuộc tính cần lọc được lưu trong hệ facet thay vì JSON. `metadata` chỉ dành cho dữ liệu bổ sung không tham gia nghiệp vụ cốt lõi.

### Tồn kho

`inventory_items.on_hand` là lượng vật lý; `reserved` là lượng đang được giữ cho checkout hoặc đơn chờ thanh toán. Lượng có thể bán:

```text
available = on_hand - reserved
```

Mọi thay đổi phải đồng thời ghi `inventory_movements`. Không cập nhật tồn kho trực tiếp từ frontend.

### Snapshot đơn hàng

`order_items` lưu lại tên sản phẩm, SKU, ảnh, thuộc tính và giá tại thời điểm mua. `order_addresses` lưu địa chỉ snapshot. Vì vậy đơn cũ không thay đổi khi khách sửa địa chỉ hoặc admin sửa/xóa sản phẩm.

### Trạng thái độc lập

- `orders.status`: tiến độ xử lý đơn.
- `orders.payment_status`: tình trạng tiền.
- `shipments.status`: tình trạng giao nhận.

Không gộp ba khái niệm này thành một cột trạng thái.

### Idempotency

`orders.idempotency_key` ngăn double-click tạo hai đơn. `payments.idempotency_key`, `payment_events.provider_event_id` và `shipment_events.provider_event_id` ngăn webhook được xử lý lặp.

### Soft delete

`users` và `products` có `deleted_at` để giữ khóa ngoại lịch sử. Sản phẩm ngừng bán nên chuyển sang `ARCHIVED`; không xóa cứng nếu đã xuất hiện trong đơn hàng.

## 4. Transaction checkout bắt buộc

Checkout cần chạy trong một transaction phía backend:

1. Khóa các dòng `inventory_items` liên quan bằng `SELECT ... FOR UPDATE`.
2. Đọc lại variant, giá, trạng thái và `on_hand - reserved`.
3. Kiểm tra coupon, thời gian hiệu lực, tổng lượt và lượt theo người dùng.
4. Tính lại subtotal, phí vận chuyển, giảm giá và tổng cộng trên server.
5. Tạo `orders`, `order_addresses`, `order_items` và `order_coupons`.
6. Tăng `reserved`, ghi `inventory_movements` loại `RESERVE`.
7. Ghi `coupon_redemptions` nếu mã được dùng.
8. Chuyển cart sang `CONVERTED`.
9. Commit rồi mới gọi cổng thanh toán ngoài transaction.

Nếu tạo phiên thanh toán thất bại, giữ đơn ở `PENDING` trong một khoảng thời gian. Job hết hạn sẽ hủy đơn, giảm `reserved` và ghi movement `RELEASE`.

Khi thanh toán thành công, một transaction khác chuyển `reserved` thành bán thực tế: giảm `on_hand`, giảm `reserved`, ghi movement `SALE` và cập nhật trạng thái đơn.

## 5. Xử lý webhook thanh toán

1. Xác minh chữ ký trước khi tin payload.
2. Insert `payment_events` với `provider_event_id` duy nhất.
3. Nếu bị unique conflict, trả HTTP 200 mà không xử lý lần hai.
4. Khóa dòng `payments` và `orders` tương ứng.
5. Chỉ cho phép chuyển trạng thái hợp lệ, ví dụ `PENDING -> PAID`.
6. Cập nhật order và tồn kho trong cùng transaction.
7. Đưa email/SMS vào `notifications`; gửi bất đồng bộ sau commit.

Không nhận số tiền, trạng thái hoặc tổng đơn từ trình duyệt làm nguồn sự thật.

## 6. Constraint không thể biểu diễn hoàn toàn bằng CHECK

Các quy tắc sau cần service transaction hoặc trigger chuyên biệt vì liên quan nhiều dòng:

- Số lượng return không vượt số lượng đã mua trừ số đã trả trước đó.
- Review phải thuộc đúng người mua và đúng `order_item` đã giao.
- Coupon theo sản phẩm/danh mục phải thực sự áp dụng được cho ít nhất một order item.
- Category không được tạo chu trình nhiều cấp.
- Tổng các payment thành công trừ refund không vượt `orders.grand_total`.
- Tổng shipment item nếu bổ sung giao tách kiện không vượt order item.

## 7. Index chính

- Catalog: category + status, featured, full-text name/description và GIN metadata.
- Order: user + ngày, status + ngày, payment status và số điện thoại khách.
- Inventory: variant unique và lịch sử movement theo thời gian.
- Payment: transaction ID, idempotency key và payment đang chờ.
- Shipment: carrier + tracking code và timeline event.
- Review: product + status và hàng chờ duyệt.
- Audit: entity + ID + thời gian và actor + thời gian.

Kiểm tra `EXPLAIN ANALYZE` với dữ liệu thật trước khi bổ sung index mới; quá nhiều index làm chậm ghi đơn và tồn kho.

## 8. Bảo mật dữ liệu

- Hash mật khẩu bằng Argon2id hoặc bcrypt; không mã hóa đối xứng mật khẩu.
- Chỉ lưu hash của OTP, refresh token và token đặt lại mật khẩu.
- Không lưu CVV hoặc số thẻ đầy đủ; chỉ lưu transaction ID do nhà cung cấp trả về.
- Tài khoản ứng dụng không nên có quyền `DROP`, `CREATE ROLE` hoặc superuser.
- Tách tài khoản migration và runtime.
- Ghi audit cho thay đổi giá, tồn kho, đơn, refund, permission và cấu hình.
- Mã hóa backup và giới hạn truy cập dữ liệu khách hàng theo permission.

## 9. Triển khai

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/schema.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/seed.sql
```

`schema.sql` dành cho database mới. Khi dự án bắt đầu vận hành, mọi thay đổi tiếp theo phải được tạo thành migration tăng dần; không sửa trực tiếp schema production.

## 10. Backup và vận hành

- Backup đầy đủ hằng ngày, giữ tối thiểu 30 ngày.
- Bật point-in-time recovery cho production.
- Kiểm thử restore định kỳ, không chỉ kiểm tra job backup thành công.
- Theo dõi deadlock, slow query, connection pool và bảng event/audit tăng nhanh.
- Có chính sách archive `payment_events`, `shipment_events`, `notifications` và `audit_logs` theo thời hạn pháp lý và vận hành.
