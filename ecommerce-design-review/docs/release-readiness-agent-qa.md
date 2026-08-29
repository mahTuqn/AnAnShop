# Independent release review — Agent Admin-QA

Ngày rà soát: 28/08/2026. Phạm vi: production admin UI, navigation, accessibility cơ bản, Mermaid, traceability và test contracts. Đây là đánh giá độc lập; không xác nhận các adapter bên ngoài khi chưa có integration test.

## Kết luận

**NO-GO cho production.** UI prototype admin đã đủ phạm vi trình diễn và type-safe, nhưng chưa có security boundary hay persistence thật. Có thể dùng cho UX review; không được mở route admin trên môi trường công khai.

## Bằng chứng đạt

- Đủ 16 route file: dashboard; orders; products và editor `[id]`; categories; inventory; customers; promotions; returns; reviews; content; staff; access; reports; settings; audit.
- Navigation desktop/mobile chứa đủ 15 khu vực top-level, bao gồm returns, staff và access.
- Detail dialog có accessible name `Chi tiết`; nút đóng, form labels, skip link, visible focus global và table overflow container đã có.
- `activity-diagram.mermaid` đã tạo Order `PENDING` sau reservation và trước nhánh payment, phù hợp FK bắt buộc `payments.order_id`.
- `admin-use-case-diagram`, `admin-activity-diagram` và `admin-domain-class-diagram` bổ sung RBAC, returns/refunds, inventory movement và audit.
- Traceability đã đánh dấu UI staff/access/returns là implemented và liên kết tới bảng dữ liệu/API dự kiến.
- Typecheck từng bị chặn bởi cast runtime persistence; manager đã nhận correction và phải chạy lại trước release. Playwright discovery đạt, gồm Chromium/mobile và spec mở rộng.

## Blocker P0

| ID | Blocker | Bằng chứng / rủi ro | Điều kiện đóng |
|---|---|---|---|
| P0-SEC-01 | Chưa bảo vệ `/admin` bằng server-side authentication/RBAC | `admin/layout.tsx` chỉ render `AdminShell`; không có middleware/proxy/guard. Người không đăng nhập có thể mở UI. | Guard server cho page và `/api/admin/*`; test guest redirect, role allow/deny. |
| P0-API-01 | Admin chưa có API implementation | Chỉ có typed paths trong `lib/admin/contracts.ts`; UI dùng dữ liệu tĩnh. | Implement API với validation, pagination/error envelope và integration tests. |
| P0-DATA-01 | Mutation không persistence | Save/create/update chỉ đóng dialog hoặc đổi React state; reload mất dữ liệu. | Nối service/API/database, loading/error/success và optimistic concurrency. |
| P0-AUD-01 | UI tuyên bố ghi audit nhưng chưa ghi thật | Settings success message nói đã ghi audit; `audit_logs` UI là fixture. | Mutation nhạy cảm tạo audit trong cùng workflow; kiểm tra before/after, actor, request ID và redaction. |
| P0-SET-01 | Schema thiếu `store_settings` | Traceability đã nêu rõ; settings không có nguồn persistence. | Chốt storage contract, migration/seed và test read-after-write. |
| P0-RET-01 | Returns/refund chưa có transaction/idempotency | UI returns tồn tại nhưng nút cập nhật chưa thực thi; API refund chưa có. | State machine + payment refund adapter + inventory movement trong transaction; idempotency replay test. |
| P0-INV-01 | Điều chỉnh tồn kho chưa thực thi khóa/constraint qua API | Form hiện chỉ là generic local form. | Row lock/optimistic version, reason bắt buộc, movement/audit và concurrent test. |
| P0-ORD-01 | Cập nhật trạng thái order chưa có state machine phía server | Nút `Cập nhật` không có handler nghiệp vụ. | Cho phép transition hợp lệ, từ chối transition sai, phát shipment/payment effects đúng một lần. |

## P1 trước khi GA

| ID | Vấn đề | Khuyến nghị |
|---|---|---|
| P1-A11Y-01 | Dialog chưa có focus trap, Escape close và return-focus | Dùng accessible dialog primitive hoặc tự hiện thực đầy đủ; bật test `fixme`. |
| P1-UX-01 | Chưa có loading/error/retry cho admin data | Thêm route `loading.tsx`, error boundary và inline retry cho mutation. |
| P1-NAV-01 | Danh sách sản phẩm chưa dẫn trực tiếp tới editor `[id]` | Cho hàng/tên sản phẩm link tới route editor, giữ button detail nếu cần quick view. |
| P1-REP-01 | Nút xuất CSV chưa hoạt động | Tạo export API có permission, time range, timezone và giới hạn dữ liệu. |
| P1-DOC-01 | Traceability vẫn mô tả activity diagram là sai dù đã sửa | Xóa gap số 3 hoặc chuyển thành “đã xử lý” để tài liệu không tự mâu thuẫn. |
| P1-ERD-01 | ERD chính là bản rút gọn | Ghi rõ ngay tiêu đề ERD hoặc sinh ERD đầy đủ từ schema để tránh dùng nhầm làm migration source. |

## Mermaid review

Tất cả bảy file có directive hợp lệ (`flowchart`, `classDiagram`, `erDiagram`), identifier không trùng trong từng file và quan hệ admin mới khớp schema ở mức khái niệm. Không có Mermaid CLI trong dependency nên vòng này chỉ kiểm tra cấu trúc tĩnh, chưa render SVG tự động. Nên thêm Mermaid parse/render vào CI documentation nếu sơ đồ là artifact phát hành.

## Test review

- `npm run typecheck`: phải đạt trước merge.
- `npx playwright test --list`: xác nhận spec compile/discovery.
- Browser E2E cần Next web server; nếu sandbox trả `spawn EPERM`, chạy trong CI hoặc môi trường cho phép child process.
- Các test `fixme` trong `admin-extended.spec.ts` là release gates có chủ đích, không phải test tùy chọn. Bỏ `fixme` ngay khi Platform cung cấp auth/API/persistence.

