# Local integration operations

## Start

1. Copy `.env.example` to `.env` and replace every placeholder secret.
2. Run `docker compose up -d` (project PostgreSQL is exposed at `localhost:5433`).
3. Run `npm run db:generate`, then `npm run db:deploy` for later migrations.
4. Run `npm run dev` and open `http://localhost:3000`.

The first empty Docker volume loads `schema.sql`, foundation seed data, and the idempotent local demo catalog. Apply migrations `0002`–`0004` to an existing volume before using the persistent runtime.

## Production safety defaults

- Keep `ADMIN_DEMO_MODE=false`.
- Set a unique `ORDER_LOOKUP_SECRET` of at least 32 random characters.
- Terminate TLS at the edge so the `anan_session` cookie is Secure.
- Never expose PostgreSQL publicly; the host mapping is for local development only.
- Do not enable real payments until signed webhooks, reconciliation, refund coordination, rate limiting and monitoring are configured.

## Verification

```bash
npm run typecheck
npm test
npm run build
npx playwright test --project=chromium --workers=1
docker compose ps
```

See `../docs/release-readiness-current.md` for the current release verdict.
