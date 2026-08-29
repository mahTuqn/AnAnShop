# Kế hoạch kiểm thử — An An Shop

## Mục tiêu và cổng phát hành

Không phát hành nếu bất kỳ kiểm thử P0 nào thất bại. Cổng tối thiểu gồm typecheck, build, unit, integration PostgreSQL thật, Playwright desktop/mobile, accessibility smoke, migration từ database rỗng và kiểm tra rollback/runbook.

## Phạm vi theo lớp

| Lớp | Công cụ | Nội dung |
|---|---|---|
| Static | TypeScript, ESLint/formatter khi tích hợp | strict types, import boundary, secret scan |
| Unit | Vitest | money integer VND, transition trạng thái, voucher, mapper, validation |
| Component | Testing Library | form errors, keyboard/focus, loading/empty/error/success |
| Integration | Vitest + PostgreSQL riêng | repository, transaction checkout, constraint, concurrent inventory |
| Contract | HTTP test | Zod schema, error envelope, pagination, authz, idempotency |
| E2E | Playwright Chromium + iPhone 13 | hành trình khách, thành viên và quản trị P0 |
| Non-functional | axe/Lighthouse/k6 ở pipeline sau | WCAG smoke, SEO, Core Web Vitals, tải checkout/webhook |

## Dữ liệu và môi trường

- Mỗi worker dùng database/schema riêng; không chia sẻ order hoặc inventory mutable.
- Seed cố định gồm: admin, staff giới hạn quyền, khách ACTIVE, khách BLOCKED, sản phẩm ACTIVE/DRAFT, SKU còn hàng/sắp hết/hết hàng, voucher hợp lệ/hết hạn/hết lượt, đơn ở từng trạng thái.
- Provider thanh toán/vận chuyển chạy adapter fake có webhook ký thật; không gọi sandbox bên ngoài trong test mặc định.
- Clock phải injectable cho expiry OTP, reservation và coupon.
- Test production-like chạy migration `schema.sql`/Prisma từ database trắng trước seed.

## Bộ P0 bắt buộc

1. Đăng ký → xác minh → đăng nhập; email trùng, token hết hạn, rate limit và user blocked.
2. Catalog → PDP → variant → cart; SKU hết hàng không thể thêm.
3. Checkout COD; server tính lại giá, tạo snapshot và chỉ trừ tồn một lần.
4. Hai checkout tranh SKU cuối: chính xác một đơn thành công.
5. Online payment: signature sai bị từ chối; webhook lặp không lặp side effect; success/failure/retry.
6. Voucher: scope, minimum, time window, global/per-user limit và concurrent redemption.
7. Ownership: khách không đọc/hủy/đánh giá đơn của người khác; admin permission được kiểm tra phía server.
8. Admin: search/detail/form cho đơn, catalog, tồn, promotion; điều chỉnh tồn có reason và audit.
9. Return/refund: không vượt số lượng/giá đã mua; refund lặp idempotent; hoàn tồn theo policy.
10. Mọi thao tác nhạy cảm tạo audit log không chứa password/token/full card data.

## Responsive và accessibility

- Viewport tối thiểu: 390×844 và desktop 1440×900.
- Không có cuộn ngang toàn trang; bảng admin được phép cuộn trong container.
- Điều khiển có accessible name, focus nhìn thấy, form có label và lỗi được liên kết qua `aria-describedby`.
- Dialog cần focus trap/return-focus khi tích hợp thư viện UI production; phiên bản hiện tại mới bảo đảm role/name/keyboard focus cơ bản.
- Màu trạng thái không phải tín hiệu duy nhất; tôn trọng `prefers-reduced-motion`.

## Security checklist

- Authn/Authz ở server cho `/admin` và `/api/admin/*`; UI ẩn nút không được coi là bảo vệ.
- Cookie HttpOnly/Secure/SameSite; CSRF cho mutation cookie-auth; CSP, rate limit và giới hạn payload upload.
- Zod parse mọi input; parameterized query; webhook verify chữ ký trên raw body.
- Không tin `unitPrice`, `discount`, `grandTotal`, `availableStock` từ client.
- Audit read-only cho staff thường; PII được mask theo permission.

## Tiêu chí hoàn tất một use case

- Ma trận truy vết có page, API, bảng và test owner.
- Happy path cùng ít nhất một validation, authz và failure path chạy tự động.
- UI có loading, empty, error, success; mobile và keyboard dùng được.
- Mutation có transaction/idempotency tương ứng, structured log và audit khi cần.
- Test không phụ thuộc thứ tự, không dùng timeout cố định và không gọi dịch vụ ngoài.

