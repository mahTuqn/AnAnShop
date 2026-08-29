# Kế hoạch triển khai đa tác tử — An An Shop

## Mục tiêu

Chuyển prototype React/Vite hiện tại thành một hệ thống thương mại điện tử có cấu trúc production, giữ nguyên ngôn ngữ thiết kế An An, đồng bộ với use case, class diagram, activity diagram và PostgreSQL schema đã có.

## Cách tổ chức nhóm

Nhóm sử dụng mô hình coordinator–specialist–reviewer: Codex giữ kiến trúc và tiêu chí nghiệm thu; ba agent chuyên trách làm việc trên các miền file tách biệt; mọi đầu ra đều phải build/test được và được Codex kiểm định chéo trước khi tích hợp.

| Thành viên | Vai trò | Phạm vi sở hữu |
|---|---|---|
| Codex | Manager, kiến trúc sư, tích hợp | backlog, cấu hình dự án, hợp đồng chung, build/test cuối |
| Agent Storefront | Frontend khách hàng | catalog, PDP, cart, checkout, account UI |
| Agent Platform | Backend/domain/data | domain services, validation, auth/API contracts, database integration |
| Agent Admin-QA | Admin và quality engineering | admin UI, test plan, traceability và rà soát sơ đồ |

## Nguyên tắc phối hợp

1. Mỗi agent chỉ sửa thư mục được giao để tránh xung đột.
2. Hợp đồng dữ liệu chung được định nghĩa trước, không tự ý thay đổi schema của miền khác.
3. Mọi nghiệp vụ tiền tệ dùng số nguyên VND; frontend không phải nguồn tin cậy cho giá và giảm giá.
4. Checkout, tồn kho, voucher và payment webhook phải có idempotency/transaction.
5. Mọi chức năng bảo vệ phải kiểm tra quyền ở server, không chỉ ẩn nút trên UI.
6. Definition of Done: typecheck, build, test liên quan, trạng thái empty/loading/error/success và tài liệu chạy.

## Backlog chức năng

### Khách hàng

- Trang chủ, danh mục, tìm kiếm, lọc, sắp xếp và phân trang.
- Chi tiết sản phẩm, variant, tồn kho, size guide và sản phẩm liên quan.
- Giỏ hàng khách/đã đăng nhập, wishlist và đồng bộ sau đăng nhập.
- Đăng ký, xác minh email, đăng nhập, đăng xuất, quên/đặt lại mật khẩu.
- Checkout khách/đã đăng nhập, địa chỉ, vận chuyển, voucher, COD và cổng thanh toán.
- Thành công/thất bại thanh toán, tra cứu và lịch sử/chi tiết/hủy đơn.
- Hồ sơ, sổ địa chỉ, đổi mật khẩu, thông báo, đánh giá và yêu cầu đổi trả.
- Trang nội dung: giới thiệu, liên hệ, FAQ, chính sách, cẩm nang, khuyến mãi.

### Quản trị

- Dashboard, sản phẩm/variant/image, danh mục/facet và tồn kho.
- Đơn hàng, thanh toán, vận chuyển, hủy/đổi trả/hoàn tiền.
- Khách hàng, vai trò/quyền, voucher, đánh giá và nội dung.
- Báo cáo cơ bản, audit log và cấu hình cửa hàng.

### Nền tảng

- PostgreSQL migration/seed, lớp truy cập dữ liệu và transaction checkout.
- API validation, chuẩn lỗi, pagination, idempotency và authorization.
- Object storage contract cho ảnh; adapter payment/shipping; webhook verification.
- Email/notification jobs, rate limiting, structured logging và health checks.
- Unit, integration và end-to-end tests cho luồng trọng yếu.

## Cổng kiểm định

1. **Architecture gate:** module boundaries và database mapping khớp sơ đồ.
2. **Functional gate:** các use case P0 có happy path và failure path.
3. **Security gate:** authz, validation, secrets, webhook và dữ liệu cá nhân.
4. **Quality gate:** build/typecheck/test; responsive và accessibility cơ bản.
5. **Release gate:** migration có thể lặp lại, seed demo, `.env.example` và runbook.

