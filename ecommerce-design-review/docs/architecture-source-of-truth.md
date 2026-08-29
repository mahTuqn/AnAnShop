# An An Shop — nguồn chuẩn kiến trúc

## Quyết định

`production/` là ứng dụng duy nhất hướng tới triển khai. Nó chứa Next.js App Router, React, TypeScript, PostgreSQL/Prisma, API route, session bền vững, RBAC, unit/integration/E2E tests và Docker Compose.

Thư mục gốc `src/` là prototype Figma Make để đối chiếu UX/UI. `server/` là backend Express thử nghiệm cũ. Hai phần này không phải nguồn chuẩn nghiệp vụ, không được triển khai cùng production và không được nhận thêm tính năng mới. Chúng được giữ lại để truy vết thiết kế và lịch sử chuyển đổi, chưa xóa để tránh mất dữ liệu của người dùng.

## Ranh giới sở hữu

| Phạm vi | Nguồn chuẩn | Vai trò |
|---|---|---|
| Storefront, account, admin | `production/src/app`, `production/src/components` | Mã triển khai |
| API và domain | `production/src/app/api`, `production/src/modules`, `production/src/lib/server` | Mã triển khai |
| Database | `database/schema.sql`, `database/migrations`, `production/prisma` | Baseline, migration và ORM |
| UX tham chiếu | `src/` | Prototype, không triển khai |
| Express cũ | `server/` | Legacy, không triển khai |
| Sơ đồ và traceability | `docs/` | Tài liệu kiểm chứng |

## Quy tắc thay đổi

1. Tính năng mới và sửa lỗi production chỉ thực hiện trong `production/` cùng test tương ứng.
2. Không sao chép nghiệp vụ từ `server/` sang production nếu chưa kiểm tra lại transaction, auth và schema.
3. Prototype chỉ được cập nhật khi cần đồng bộ thiết kế; không dùng dữ liệu fixture của prototype làm bằng chứng release.
4. Quality gates chính thức chạy từ `production/`: `npm run typecheck`, `npm test`, `npm run build`, `npm run test:e2e`.

## Trạng thái legacy

Express legacy từng có JWT secret dự phòng và tài khoản demo cố định. Secret dự phòng đã bị loại bỏ; nếu chạy legacy bắt buộc cung cấp `JWT_SECRET` tối thiểu 32 ký tự. Tài khoản/seed demo không được sử dụng ở môi trường thật. Lộ trình an toàn là đóng băng rồi lưu trữ `src/` và `server/` sau khi production đạt parity, thay vì xóa ngay.
