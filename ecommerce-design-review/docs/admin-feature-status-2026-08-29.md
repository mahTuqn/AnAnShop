# Trạng thái tính năng backoffice — 29/08/2026

## Đã nối dữ liệu persistent

| Phạm vi | API / UI | Trạng thái |
|---|---|---|
| Dashboard | `GET /api/admin/dashboard`, `/admin` | API có doanh thu hôm nay/tháng/tổng, tổng đơn, đang xử lý, hủy, tổng khách/sản phẩm, sắp hết hàng, top sản phẩm/danh mục, chuỗi doanh thu và tỷ lệ hủy. |
| Khách hàng | `/api/admin/customers`, `/api/admin/customers/[id]`, `/admin/customers` | Tìm kiếm, lọc, chi tiết, lịch sử đơn/địa chỉ, tổng chi tiêu, khóa/mở khóa, hạng `NORMAL/SILVER/GOLD/DIAMOND`; tổng tiền dùng aggregate riêng để không nhân theo địa chỉ. |
| Danh mục | `/api/admin/categories`, `/api/admin/categories/[id]`, `/admin/categories` | Danh sách, tạo, sửa, ẩn/hiện, xóa khi rỗng; kiểm tra UUID, cha tồn tại, self-parent và cycle. |
| Đánh giá | `/api/admin/reviews`, `/api/admin/reviews/[id]`, `/admin/reviews` | Tìm/lọc, xem nội dung/ảnh/xác thực mua hàng, duyệt hoặc ẩn; ghi audit. |
| Nội dung/banner | `/api/admin/content`, `/api/admin/content/[id]`, `/admin/content` | Tạo bản nháp, xem, xuất bản/lưu trữ; RBAC riêng `content.read/content.write`. |
| Báo cáo | `GET /api/admin/reports`, `/admin/reports` | Doanh thu, đơn hàng, sản phẩm, tồn kho, khách hàng; khoảng 7/30/90/365 ngày; xuất CSV UTF-8 từ dữ liệu thật. Doanh thu ngày loại đơn hủy được đặt tên rõ `non_cancelled_revenue`. |

## Đã có API persistent từ trước và được giữ nguyên

- Sản phẩm, tồn kho, đơn hàng và state transition, voucher, đổi trả, hoàn tiền idempotent, nhân viên, vai trò/quyền, audit log và cài đặt cửa hàng.
- Mọi route quản trị đều kiểm tra permission phía server; thay đổi quan trọng có audit log.

## Khoảng trống không được giả lập

- `brands`, chiến dịch marketing và flash sale chưa có bảng nguồn chuẩn; không hiển thị fixture như dữ liệu thật.
- Product editor sâu cho option/value, variant, ảnh và SKU vẫn cần nối toàn bộ mutation persistent; API product hiện chỉ bao phủ product cơ bản/status/featured.
- Excel/PDF chưa bật vì dự án chưa có bộ sinh file được kiểm thử. CSV là định dạng export vận hành hiện có.
- Tích hợp bên thứ ba chỉ được bật khi có credential, xác thực callback/webhook và test sandbox.

## Bằng chứng kiểm thử

- `npm run typecheck`: đạt ngày 29/08/2026.
- Unit admin dashboard/RBAC/state machine: cần chạy ngoài Windows restricted-token sandbox nếu Vitest báo `spawn EPERM`; đây là hạn chế môi trường, không phải assertion fail.
