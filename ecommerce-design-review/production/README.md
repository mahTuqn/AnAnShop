# An An Shop — Production application

Ứng dụng production được xây bằng Next.js App Router, React, TypeScript, Tailwind CSS và PostgreSQL/Prisma. Prototype Figma Make ở thư mục cha được giữ làm chuẩn đối chiếu giao diện.

## Chạy cục bộ

1. Sao chép `.env.example` thành `.env` và cập nhật biến môi trường.
2. Chạy `npm install`.
3. Khởi tạo PostgreSQL rồi chạy `npm run db:generate` và `npm run db:deploy`.
4. Chạy `npm run dev`, truy cập `http://localhost:3000`.

## Quality gates

```bash
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Không dùng dữ liệu do trình duyệt gửi lên làm nguồn giá/tồn kho cuối cùng. Checkout, voucher, tồn kho và payment webhook phải được xác nhận tại server.
