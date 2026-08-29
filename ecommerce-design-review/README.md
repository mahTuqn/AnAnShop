# An An Shop

Ứng dụng triển khai chính thức nằm trong `production/` và sử dụng Next.js, React, TypeScript, PostgreSQL/Prisma. Hãy bắt đầu tại `production/README.md`.

## Chạy ứng dụng chính

```powershell
cd production
Copy-Item .env.example .env
docker compose up -d
npm ci
npm run db:generate
npm run dev
```

Mở `http://localhost:3000`. PostgreSQL của dự án được ánh xạ tại `localhost:55433` để tránh xung đột với PostgreSQL cục bộ hoặc stack khác.

## Kiểm tra chất lượng

```powershell
cd production
npm run typecheck
npm test
npm run build
npm run test:e2e
```

## Mã nguồn tham chiếu

- `src/`: prototype Figma Make, chỉ dùng đối chiếu UX/UI.
- `server/`: backend Express legacy đã đóng băng, không triển khai.
- `database/`: baseline schema, migrations và seed dùng chung.
- `docs/`: sơ đồ, traceability, test plan và release evidence.

Không dùng tài khoản demo, secret mẫu hoặc backend legacy ở production. Xem `docs/architecture-source-of-truth.md` để biết ranh giới kiến trúc và lộ trình lưu trữ mã cũ.
