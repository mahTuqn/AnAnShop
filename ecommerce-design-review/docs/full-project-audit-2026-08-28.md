# Full project audit — 2026-08-28

## Phạm vi và cách tổ chức

Codex điều phối ba nhánh chuyên môn: storefront/UX, backend/security/database, và admin/QA/architecture. Cách chia việc áp dụng mô hình coordinator–specialist–reviewer, task decomposition và evaluator/critic từ repo `kyegomez/awesome-multi-agent-papers`. Mọi thay đổi cuối cùng được manager hợp nhất và chạy lại gate độc lập.

Nguồn triển khai duy nhất là `production/`. Prototype Figma Make ở `src/` và Express ở `server/` chỉ là tài liệu tham chiếu/legacy.

## Những phần đã hoàn thiện

- Storefront đọc catalog/PDP/wishlist từ runtime/API chuẩn thay vì fixture ID cũ.
- PDP → cart → cập nhật/xóa số lượng → checkout ba bước → COD → success hoạt động với memory store và PostgreSQL.
- Giá, coupon, tồn kho và phí giao hàng 699.000đ được tính lại ở server; checkout có owner-scoped idempotency.
- MoMo, VNPay và giao nhanh chưa có adapter thật được khóa và ghi rõ “Sắp ra mắt”, không giả lập thành công.
- Đăng ký, đăng nhập, HttpOnly session cookie, logout/revoke, account orders và chi tiết đơn hàng đã nối API.
- Wishlist dùng catalog chuẩn; cart có nhãn số lượng accessible; mobile navigation/search/skip-link được bổ sung.
- Admin có 15 khu vực, guard fail-closed, permission riêng cho audit, validation filter, atomic refund/audit và các màn hình P0 returns/staff/access.
- Database compose tự áp dụng schema, migration 0002–0004, seed quyền/cài đặt và demo catalog theo đúng thứ tự.
- Cổng PostgreSQL đổi sang 55433 vì máy phát triển có `postgres.exe` chiếm 5433.
- HTTP security headers được bổ sung; legacy JWT/OAuth fail-closed và dependency runtime legacy sạch.
- CI kiểm tra production, schema/migration/seed, runtime audit, prototype build và legacy compile.

## Evidence kiểm thử

- Production TypeScript: PASS.
- Unit/domain: 20/20 PASS trên 12 file.
- Next.js production build: PASS, 51 trang được prerender và toàn bộ route động/API biên dịch.
- Chromium E2E: 65 PASS, 6 SKIP có chủ đích.
- Mobile contract: storefront/auth 3/3 PASS; admin navigation 1/1 PASS trên viewport 390×844.
- PostgreSQL TCP qua đúng `DATABASE_URL`: database `anan_shop`, 3 product, 5 variant, 12 permission.
- Persistent smoke: 10 case đầu PASS; case mapping size được sửa và nhóm integrated chạy lại 3/3 PASS.
- Prototype Vite build: PASS.
- Legacy Express TypeScript build: PASS; `npm audit --omit=dev`: 0 vulnerability.

## Các giới hạn release còn lại

- Password reset chưa có email provider/token-consumption end-to-end; UI đã bỏ phản hồi thành công giả và báo trạng thái chưa cấu hình.
- Thanh toán thật ngoài COD chưa có provider, webhook ký số và reconciliation.
- Một số bảng/form admin vẫn là fixture/demo; 5 test persistence/RBAC/refund nâng cao còn `fixme`, 1 test guard strict được skip theo mode.
- Chưa có object storage, rate limit phân tán, observability/alerting, backup-restore drill và security review độc lập.
- Advisory `deepmerge-ts` qua Prisma 7 đã được xử lý bằng override có mục tiêu lên nhánh 8; Prisma validate/generate, typecheck, unit và build đều PASS; `npm audit --omit=dev` hiện 0 vulnerability.

## Kết luận

GO cho development/staging và demo nghiệp vụ COD. NO-GO cho nhận tiền thật hoặc mở public production cho đến khi đóng các giới hạn release ở trên.