# An An Shop — trạng thái tích hợp hiện tại

Ngày kiểm định: 2026-08-28.

## Kết quả đã xác minh

- TypeScript production: **PASS**.
- Unit/domain: **20/20 PASS** trên 12 file.
- Next.js production build: **PASS**, 51 trang prerender; toàn bộ route động/API biên dịch.
- Chromium E2E: **65 PASS**, 6 test skip có chủ đích.
- Mobile 390×844: storefront/auth **3/3 PASS**, admin navigation **1/1 PASS**.
- PostgreSQL 17 qua cổng 55433: healthy; schema, migration 0002–0004 và seed hoạt động; catalog có 3 sản phẩm/5 biến thể.
- Persistent smoke: auth/session/cart/checkout/order lookup **PASS**; mapping size PostgreSQL đã được sửa và integrated **3/3 PASS**.
- Prototype Vite build và legacy Express compile: **PASS**.

## P0 đã đóng

- Catalog/PDP/wishlist/cart/checkout/account dùng nguồn dữ liệu chuẩn, không còn lệch ID fixture trong luồng chính.
- Checkout đọc lại giá, coupon và tồn kho trong transaction; idempotency được scope theo owner; ngưỡng freeship thống nhất 699.000đ.
- Chỉ COD được mở; payment/giao nhanh chưa có adapter được khóa và thông báo trung thực.
- Session HttpOnly, logout revoke, guest lookup HMAC, admin guard/RBAC/audit fail-closed.
- Database fresh-start tự chạy đủ migration trước seed; cổng 55433 tránh xung đột PostgreSQL cục bộ.
- CI, HTTP security headers, dependency cleanup và tài liệu source-of-truth đã được bổ sung.

## Chưa đủ để GO production thật

- Chưa có email provider và password-reset token flow end-to-end.
- Chưa có MoMo/VNPay/card provider, signed webhook và reconciliation.
- Một số admin form/bảng còn dùng fixture; còn 5 E2E nâng cao đánh dấu `fixme`.
- Cần rate limit phân tán, object storage, observability, backup/restore drill và security review độc lập.
- Dependency audit hiện sạch sau override `deepmerge-ts` có mục tiêu; cần tiếp tục theo dõi compatibility khi nâng Prisma major.

Kết luận: **GO development/staging và demo COD; NO-GO cho nhận tiền thật/public production**. Chi tiết: `docs/full-project-audit-2026-08-28.md`.