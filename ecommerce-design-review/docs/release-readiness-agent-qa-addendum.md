# Admin-QA release addendum — Chromium và API thực tế

Ngày chạy: 28/08/2026. Tài liệu này thay thế trạng thái kiểm chứng trong `release-readiness-agent-qa.md` khi hai tài liệu khác nhau.

## Kết quả thực thi

- `npm run typecheck`: **PASS**.
- Chromium admin suites: **36 passed, 5 intentional fixme**, 0 failed, 21,5 giây.
- Admin API security: **13 passed**, 0 failed, 8,8 giây.
- Không quan sát thấy hydration error trong vòng Chromium.
- Phát hiện một React warning thật ở dashboard: `key={height + index}` tạo key `68` hai lần. Cần đổi thành key ghép chuỗi có index.

## Phần đã được xác minh

1. Tất cả route admin top-level và editor sản phẩm render trên Chromium, không gây overflow toàn trang.
2. Navigation desktop/mobile có returns, staff và access.
3. Search, filter, empty state, detail và create form hoạt động trên fixture UI.
4. Detail dialog có accessible name và đóng bằng nút.
5. Editor biến thể thêm dòng và phản hồi save cục bộ.
6. Mười một GET `/api/admin/*`, bảy mutation không session và bearer token không hợp lệ đều trả `401 UNAUTHORIZED`; không hạ cấp thành guest và không rò `passwordHash`.
7. TypeScript không còn lỗi runtime resolver.

## Đánh giá API/RBAC Platform

### Đã đạt một phần

- `adminRoute` bắt buộc bearer session và permission trước khi chạy validation/database.
- Vai trò/quyền được đọc từ `user_roles`, `roles`, `role_permissions`, `permissions`.
- Inventory adjustment khóa dòng, kiểm tra tồn không thấp hơn reserved và tạo movement trong transaction.
- Refund có `Idempotency-Key`, unique index, serializable transaction, khóa payment và chặn hoàn vượt số đã trả.
- Order có allow-list transition cơ bản.
- Migration `0003_store_settings_and_refund_idempotency.sql` đã bổ sung `store_settings` và refund idempotency.

### P0 còn mở

| ID | Blocker | Bằng chứng | Điều kiện đóng |
|---|---|---|---|
| P0-PAGE-AUTH | Page `/admin/*` chưa có server guard | `app/admin/layout.tsx` render shell trực tiếp; API guard không ngăn lộ UI/PII fixture. | Server layout/proxy guard và test guest redirect + permission page. |
| P0-SESSION | Admin session chưa bền vững | `PersistentStore.sessions` là `Map` trong process và có comment transitional. Restart/đa instance làm mất session. | Better Auth/database session, secure cookie hoặc token lifecycle production, revoke/expiry tests. |
| P0-UI-DATA | UI chưa nối API | Tables, dashboard, settings, staff/access/returns vẫn dùng fixture/local state. | Fetch authenticated API, loading/error/retry, mutation persistence và cache invalidation. |
| P0-AUDIT-TX | Audit không atomic với mutation | `adminRoute` gọi `writeAudit` sau khi operation đã commit; audit fail vẫn có thể để mutation thành công. | Mutation + audit cùng transaction/outbox bắt buộc; failure integration test. |
| P0-AUDIT-PERM | Audit dùng permission quá rộng | `/api/admin/audit` yêu cầu `reports.read`, không phải permission audit riêng. | Dùng `audit.read`, mask PII và test report-role bị 403. |
| P0-RETURN-SM | Return API cho phép nhảy trạng thái tùy ý | PATCH chỉ kiểm tra status thuộc enum, không kiểm tra transition hiện tại. | State machine + row lock/version; chặn REQUESTED→REFUNDED và terminal replay. |
| P0-REFUND-WF | Refund mới chỉ tạo record PENDING | Chưa gọi provider, cập nhật payment status, return status hay inventory theo kết quả. | Adapter refund + reconciliation/webhook/job, payment/return/inventory atomic workflow và replay test. |
| P0-ORDER-CONC | Order transition thiếu concurrency/effect coordination | Read rồi update không row lock/version; SHIPPING/DELIVERED/CANCELLED chưa phối hợp shipment/inventory/payment. | Optimistic version hoặc row lock; idempotency và effect tests. |
| P0-STAFF-MUT | Staff/RBAC chỉ có GET | Chưa có invite, assign/revoke role, create/update role endpoints dù UI có nút tạo. | Mutation endpoints, least-privilege validation, self-lockout protection và audit. |

## P1 hardening

- Tích hợp `AccessibleDialog` mới vào resource và operation pages để đóng bằng Escape, focus trap và return-focus; test hiện còn `fixme`.
- Tích hợp `AdminAsyncState` vào mọi page API-backed.
- Dùng `ProductEditorLink` trong danh sách sản phẩm; hiện editor chỉ truy cập trực tiếp bằng URL.
- Dùng `CsvExportButton` cùng export API có permission; nút báo cáo hiện chưa có hành vi.
- Sửa duplicate dashboard key thành ``key={`${height}-${index}`}``.
- Validate enum query trước Prisma và validate ngày promotion để trả 400 thay vì lỗi database/500.
- Đồng bộ schema chuẩn: migration có `store_settings` nhưng `database/schema.sql`/traceability vẫn mô tả thiếu.

## Release verdict

**NO-GO production, GO cho UX/demo có kiểm soát.** Security boundary của API đã có và unauthenticated tests đạt, nhưng page guard, durable session, API-backed UI và atomic business/audit workflows vẫn là P0.

