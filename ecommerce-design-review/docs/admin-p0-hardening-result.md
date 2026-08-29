# Admin P0 hardening result

Ngày kiểm chứng: 28/08/2026.

## Đã hoàn tất

- `/admin/*` dùng server guard, ưu tiên HttpOnly cookie chung `anan_session`, fallback tạm `anan_admin_session`.
- Production fail-closed; dev demo được bật mặc định và có thể tắt bằng `ADMIN_DEMO_MODE=false`.
- Guard resolve session và kiểm tra role `ADMIN`/`STAFF` phía server, không chỉ kiểm tra cookie tồn tại.
- ResourcePageV3 giữ search/filter/empty/reset contracts, thêm editor link và accessible dialog.
- Dialog trap focus, đóng bằng Escape, khóa scroll và trả focus về trigger.
- Admin segment có loading/error/retry boundary.
- Reports có CSV download; product list dẫn tới editor.
- Dashboard duplicate React key đã được sửa.

## Kết quả chạy

| Suite | Kết quả |
|---|---:|
| Typecheck | PASS |
| Core/V3 Chromium | 37 passed, 6 intentional skipped, 0 failed |
| Strict guard `ADMIN_DEMO_MODE=false` | 1 passed, 1 mode-specific skipped |
| Accessibility/editor/CSV hardening | 4 passed, 0 failed |
| Admin API unauthenticated boundary | 13 passed, 0 failed |

Không quan sát thấy hydration error trong các lượt chạy cuối.

## P0 còn ngoài phạm vi UI sprint

1. Thay session `Map` trong process bằng durable database/Better Auth session.
2. Nối admin UI fixture với API thật, persistence, loading/error và cache invalidation.
3. Đưa audit vào cùng transaction/outbox với mutation và dùng permission `audit.read` riêng.
4. Hoàn thiện transition/concurrency/effect coordination cho order, return và refund.
5. Hoàn thiện staff/RBAC mutation và kiểm tra tự khóa quyền.

